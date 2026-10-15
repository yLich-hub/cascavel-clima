import "server-only";
import { PROVIDER_MAX_RETRIES } from "@/lib/config";
import {
  ProviderError,
  fetchOpenMeteo,
  type OpenMeteoResponse,
} from "@/lib/providers/open-meteo";
import { runtimeCacheStore, type LastGoodStore } from "@/lib/weather/last-good-store";
import { normalizeOpenMeteo } from "@/lib/weather/normalize";
import type { WeatherReport, WeatherResult } from "@/types/weather";

/** Sem dado novo e sem dado anterior: a interface deve mostrar "indisponível". */
export class WeatherUnavailableError extends Error {
  constructor(readonly providerError: ProviderError) {
    super(`Previsão indisponível (${providerError.kind}): ${providerError.message}`);
    this.name = "WeatherUnavailableError";
  }
}

type Deps = {
  fetchRaw?: () => Promise<OpenMeteoResponse>;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  maxRetries?: number;
  retryDelayMs?: number;
  log?: (message: string) => void;
  store?: LastGoodStore;
};

const newest = (a: WeatherReport | null, b: WeatherReport | null) =>
  !a ? b : !b ? a : Date.parse(b.meta.fetchedAt) > Date.parse(a.meta.fetchedAt) ? b : a;

const toProviderError = (error: unknown): ProviderError =>
  error instanceof ProviderError
    ? error
    : new ProviderError("network", error instanceof Error ? error.message : String(error));

/**
 * Busca, com uma retentativa para erros transitórios, e guarda o último dado bom
 * em memória e no `store` (Runtime Cache da Vercel, compartilhado entre
 * instâncias). Se o provedor falhar, devolve o mais recente dos dois com
 * `servedFrom: "fallback"` — a idade real continua em `meta.fetchedAt`, então a
 * interface avisa. Falhas do próprio store nunca derrubam a requisição.
 */
export function createWeatherService({
  fetchRaw = () => fetchOpenMeteo(),
  now = () => new Date(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxRetries = PROVIDER_MAX_RETRIES,
  retryDelayMs = 500,
  log = (message) => console.error(message),
  store = runtimeCacheStore(),
}: Deps = {}) {
  let lastGood: WeatherReport | null = null;

  async function readStore(): Promise<WeatherReport | null> {
    try {
      return await store.get();
    } catch (error) {
      log(`[weather] não foi possível ler o último dado bom: ${String(error)}`);
      return null;
    }
  }

  async function writeStore(report: WeatherReport) {
    try {
      await store.set(report);
    } catch (error) {
      log(`[weather] não foi possível gravar o último dado bom: ${String(error)}`);
    }
  }

  async function fetchWithRetry(): Promise<OpenMeteoResponse> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fetchRaw();
      } catch (error) {
        const providerError = toProviderError(error);
        if (!providerError.retryable || attempt >= maxRetries) throw providerError;
        log(`[weather] tentativa ${attempt + 1} falhou (${providerError.kind}); repetindo`);
        await sleep(retryDelayMs);
      }
    }
  }

  return {
    async load(): Promise<WeatherResult> {
      try {
        const raw = await fetchWithRetry();
        const report = normalizeOpenMeteo(raw, now());
        lastGood = report;
        await writeStore(report);
        return { report, servedFrom: "live" };
      } catch (error) {
        const providerError = toProviderError(error);
        log(`[weather] provedor falhou (${providerError.kind}): ${providerError.message}`);
        const fallback = newest(lastGood, await readStore());
        if (fallback) return { report: fallback, servedFrom: "fallback" };
        throw new WeatherUnavailableError(providerError);
      }
    },
  };
}

export const weatherService = createWeatherService();
