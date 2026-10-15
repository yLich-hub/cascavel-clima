import "server-only";
import { getCache } from "@vercel/functions";
import { FRESHNESS } from "@/lib/config";
import type { WeatherReport } from "@/types/weather";

/**
 * Onde guardar o "último dado bom" para usar quando o provedor falhar.
 *
 * Na Vercel, a memória de uma instância é descartável: por isso o dado vai para
 * o Runtime Cache, compartilhado entre instâncias. Fora da Vercel (dev e testes)
 * o `getCache` cai automaticamente para memória local.
 */
export type LastGoodStore = {
  get(): Promise<WeatherReport | null>;
  set(report: WeatherReport): Promise<void>;
};

/** Mude ao alterar o formato de WeatherReport: dados antigos passam a ser ignorados. */
// v2 (D1 do novo visual): vento por hora, nascer/pôr do sol e UV máximo.
export const REPORT_SCHEMA_VERSION = 2;

const KEY = `weather-last-good-v${REPORT_SCHEMA_VERSION}`;
// Mais velho que isso a previsão já não é exibida (freshness.ts), então não vale guardar.
const TTL_SECONDS = FRESHNESS.forecast.expiredAfterMin * 60;
// No plano Hobby todos os projetos da conta dividem o mesmo Runtime Cache.
const NAMESPACE = "cascavel-clima";

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
  // getCache só é chamado no uso, não ao importar o módulo.
  const cache = () => getCache({ namespace: NAMESPACE });
  return {
    async get() {
      const value = await cache().get(KEY);
      return isWeatherReport(value) ? value : null;
    },
    async set(report) {
      await cache().set(KEY, report, { ttl: TTL_SECONDS, name: "ultimo-dado-bom" });
    },
  };
}

/** Para testes: guarda em memória, como uma instância de servidor isolada. */
export function memoryStore(initial: WeatherReport | null = null): LastGoodStore {
  let value = initial;
  return {
    async get() {
      return value;
    },
    async set(report) {
      value = report;
    },
  };
}
