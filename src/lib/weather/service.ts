import "server-only";
import {
  ProviderError,
  fetchOpenMeteo,
  type OpenMeteoResponse,
} from "@/lib/providers/open-meteo";
import { createResilientSource, type ResilientSourceDeps } from "@/lib/sources/resilient-source";
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

type Deps = Partial<
  Pick<
    ResilientSourceDeps<OpenMeteoResponse, WeatherReport>,
    "fetchRaw" | "now" | "sleep" | "maxRetries" | "retryDelayMs" | "log"
  >
> & { store?: LastGoodStore };

/**
 * Previsão do Open-Meteo com retentativa e último dado bom
 * (detalhes em `createResilientSource`).
 */
export function createWeatherService({
  fetchRaw = () => fetchOpenMeteo(),
  store = runtimeCacheStore(),
  ...rest
}: Deps = {}): { load(): Promise<WeatherResult> } {
  return createResilientSource({
    name: "weather",
    fetchRaw,
    normalize: normalizeOpenMeteo,
    fetchedAtOf: (report) => report.meta.fetchedAt,
    unavailable: (error) => new WeatherUnavailableError(error),
    store,
    ...rest,
  });
}

export const weatherService = createWeatherService();
