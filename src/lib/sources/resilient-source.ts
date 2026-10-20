import "server-only";
import { PROVIDER_MAX_RETRIES } from "@/lib/config";
import { ProviderError } from "@/lib/providers/http";
import type { LastGoodStore } from "@/lib/sources/last-good-store";
import type { ProviderFailure } from "@/types/weather";

export type ServedFrom = "live" | "fallback";
export type Loaded<T> = { report: T; servedFrom: ServedFrom; failure?: ProviderFailure };

export type ResilientSourceDeps<Raw, T> = {
  /** Prefixo dos logs, ex.: "weather". */
  name: string;
  fetchRaw: () => Promise<Raw>;
  /** Converte a resposta do provedor no formato guardado, carimbando `fetchedAt`. */
  normalize: (raw: Raw, fetchedAt: Date) => T;
  /** Quando o dado foi buscado; usado para escolher o mais recente entre memória e store. */
  fetchedAtOf: (report: T) => string;
  /** Erro lançado quando não há dado novo nem anterior. */
  unavailable: (error: ProviderError) => Error;
  store: LastGoodStore<T>;
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
 * em memória e no `store` (Runtime Cache da Vercel, compartilhado entre
 * instâncias). Se o provedor falhar, devolve o mais recente dos dois com
 * `servedFrom: "fallback"` — a idade real continua no próprio dado, então a
 * interface avisa. Falhas do próprio store nunca derrubam a requisição.
 *
 * Usado pela previsão do tempo (Open-Meteo) e pelos dados do El Niño (NOAA CPC).
 */
export function createResilientSource<Raw, T>({
  name,
  fetchRaw,
  normalize,
  fetchedAtOf,
  unavailable,
  store,
  now = () => new Date(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxRetries = PROVIDER_MAX_RETRIES,
  retryDelayMs = 500,
  log = (message) => console.error(message),
}: ResilientSourceDeps<Raw, T>) {
  let lastGood: T | null = null;

  const newest = (a: T | null, b: T | null) =>
    !a ? b : !b ? a : Date.parse(fetchedAtOf(b)) > Date.parse(fetchedAtOf(a)) ? b : a;

  async function readStore(): Promise<T | null> {
    try {
      return await store.get();
    } catch (error) {
      log(`[${name}] não foi possível ler o último dado bom: ${String(error)}`);
      return null;
    }
  }

  async function writeStore(report: T) {
    try {
      await store.set(report);
    } catch (error) {
      log(`[${name}] não foi possível gravar o último dado bom: ${String(error)}`);
    }
  }

  async function fetchWithRetry(): Promise<Raw> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fetchRaw();
      } catch (error) {
        const providerError = toProviderError(error);
        if (!providerError.retryable || attempt >= maxRetries) throw providerError;
        log(`[${name}] tentativa ${attempt + 1} falhou (${providerError.kind}); repetindo`);
        await sleep(retryDelayMs);
      }
    }
  }

  return {
    async load(): Promise<Loaded<T>> {
      try {
        const raw = await fetchWithRetry();
        const report = normalize(raw, now());
        lastGood = report;
        await writeStore(report);
        return { report, servedFrom: "live" };
      } catch (error) {
        const providerError = toProviderError(error);
        log(`[${name}] provedor falhou (${providerError.kind}): ${providerError.message}`);
        const fallback = newest(lastGood, await readStore());
        if (fallback) {
          const failure: ProviderFailure = {
            kind: providerError.kind,
            ...(providerError.status !== undefined && { status: providerError.status }),
            message: providerError.message.slice(0, 200),
            at: now().toISOString(),
          };
          return { report: fallback, servedFrom: "fallback", failure };
        }
        throw unavailable(providerError);
      }
    },
  };
}
