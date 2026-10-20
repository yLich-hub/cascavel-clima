import "server-only";
import { FRESHNESS } from "@/lib/config";
import {
  memoryStore as genericMemoryStore,
  runtimeCacheStore as genericRuntimeCacheStore,
  type LastGoodStore as GenericStore,
} from "@/lib/sources/last-good-store";
import type { WeatherReport } from "@/types/weather";

/** Último dado bom da previsão (mecanismo em lib/sources/last-good-store.ts). */
export type LastGoodStore = GenericStore<WeatherReport>;

/** Mude ao alterar o formato de WeatherReport: dados antigos passam a ser ignorados. */
// v2 (D1 do novo visual): vento por hora, nascer/pôr do sol e UV máximo.
export const REPORT_SCHEMA_VERSION = 2;

/** Checagem estrutural mínima: o dado vem de fora do processo e pode estar num formato antigo. */
export function isWeatherReport(value: unknown): value is WeatherReport {
  if (typeof value !== "object" || value === null) return false;
  const report = value as Partial<WeatherReport>;
  return (
    typeof report.meta?.fetchedAt === "string" &&
    typeof report.meta?.modelTime === "string" &&
    typeof report.current?.temperatureC === "number" &&
    typeof report.location?.name === "string" &&
    Array.isArray(report.hourly) &&
    Array.isArray(report.daily) &&
    // Campos da v2: um dado da v1 que escapasse da troca de chave ainda é recusado.
    report.hourly.every((point) => "windSpeedKmh" in point) &&
    report.daily.every((day) => "uvIndexMax" in day && "sunrise" in day && "sunset" in day)
  );
}

export function runtimeCacheStore(): LastGoodStore {
  return genericRuntimeCacheStore({
    key: `weather-last-good-v${REPORT_SCHEMA_VERSION}`,
    // Mais velho que isso a previsão já não é exibida (freshness.ts), então não vale guardar.
    ttlSeconds: FRESHNESS.forecast.expiredAfterMin * 60,
    isValid: isWeatherReport,
  });
}

export const memoryStore = (initial: WeatherReport | null = null): LastGoodStore =>
  genericMemoryStore(initial);
