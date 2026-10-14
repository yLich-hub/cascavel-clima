import "server-only";
import { PROVIDER_MAX_RETRIES } from "@/lib/config";
import {
  ProviderError,
  fetchOpenMeteo,
  type OpenMeteoResponse,
} from "@/lib/providers/open-meteo";
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
};

const toProviderError = (error: unknown): ProviderError =>
  error instanceof ProviderError
    ? error
    : new ProviderError("network", error instanceof Error ? error.message : String(error));

/**
 * Busca, com uma retentativa para erros transitórios, e guarda o último dado bom
 * em memória. Se o provedor falhar, devolve esse dado com `servedFrom: "fallback"`
 * — a idade real continua em `meta.fetchedAt`, então a interface avisa.
 *
 * A memória vale por instância do servidor; em serverless pode não existir,
 * e aí vale o cache do Next (ver get-weather.ts).
 */
export function createWeatherService({
  fetchRaw = () => fetchOpenMeteo(),
  now = () => new Date(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxRetries = PROVIDER_MAX_RETRIES,
  retryDelayMs = 500,
  log = (message) => console.error(message),
}: Deps = {}) {
  let lastGood: WeatherReport | null = null;

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
        lastGood = normalizeOpenMeteo(raw, now());
        return { report: lastGood, servedFrom: "live" };
      } catch (error) {
        const providerError = toProviderError(error);
        log(`[weather] provedor falhou (${providerError.kind}): ${providerError.message}`);
        if (lastGood) return { report: lastGood, servedFrom: "fallback" };
        throw new WeatherUnavailableError(providerError);
      }
    },
  };
}

export const weatherService = createWeatherService();
