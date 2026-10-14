import "server-only";
import { z } from "zod";
import { LOCATION, PROVIDER_TIMEOUT_MS } from "@/lib/config";

/**
 * Cliente do Open-Meteo (https://open-meteo.com/en/docs).
 * Só faz a chamada e valida a resposta. Retentativa, cache e fallback ficam no
 * serviço (Etapa 2).
 */

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const CURRENT_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation",
  "wind_speed_10m",
  "wind_direction_10m",
  "weather_code",
  "is_day",
] as const;

const HOURLY_VARS = [
  "temperature_2m",
  "precipitation_probability",
  "precipitation",
  "weather_code",
  "is_day",
] as const;

const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
] as const;

export function buildOpenMeteoUrl(): string {
  const params = new URLSearchParams({
    latitude: String(LOCATION.lat),
    longitude: String(LOCATION.lon),
    timezone: LOCATION.timezone,
    // Unidades sempre explícitas; a resposta é conferida pelo schema abaixo.
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    forecast_days: "7",
    forecast_hours: "24",
    current: CURRENT_VARS.join(","),
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
  });
  return `${BASE_URL}?${params}`;
}

// --- Schema da resposta -------------------------------------------------------

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const flag = z.union([z.literal(0), z.literal(1)]);
const wmoCode = z.number().int().min(0).max(99);
const temperature = z.number().min(-50).max(60);
const percent = z.number().min(0).max(100);
const nonNegative = z.number().min(0);

/** Exige que todas as séries tenham o mesmo tamanho da série `time` e não estejam vazias. */
function sameLength(series: Record<string, unknown[]>, ctx: z.RefinementCtx) {
  const expected = series.time.length;
  if (expected === 0) {
    ctx.addIssue({ code: "custom", message: "série vazia" });
  }
  for (const [key, values] of Object.entries(series)) {
    if (values.length !== expected) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `esperado ${expected} valores, recebido ${values.length}`,
      });
    }
  }
}

export const openMeteoResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number(),
  timezone: z.literal(LOCATION.timezone),
  utc_offset_seconds: z.number().int(),

  current_units: z.object({
    temperature_2m: z.literal("°C"),
    apparent_temperature: z.literal("°C"),
    relative_humidity_2m: z.literal("%"),
    precipitation: z.literal("mm"),
    wind_speed_10m: z.literal("km/h"),
    wind_direction_10m: z.literal("°"),
  }),
  current: z.object({
    time: localDateTime,
    temperature_2m: temperature,
    apparent_temperature: temperature,
    relative_humidity_2m: percent,
    precipitation: nonNegative,
    wind_speed_10m: nonNegative,
    wind_direction_10m: z.number().min(0).max(360),
    weather_code: wmoCode,
    is_day: flag,
  }),

  hourly_units: z.object({
    temperature_2m: z.literal("°C"),
    precipitation_probability: z.literal("%"),
    precipitation: z.literal("mm"),
  }),
  hourly: z
    .object({
      time: z.array(localDateTime),
      temperature_2m: z.array(temperature.nullable()),
      precipitation_probability: z.array(percent.nullable()),
      precipitation: z.array(nonNegative.nullable()),
      weather_code: z.array(wmoCode.nullable()),
      is_day: z.array(flag.nullable()),
    })
    .superRefine(sameLength),

  daily_units: z.object({
    temperature_2m_max: z.literal("°C"),
    temperature_2m_min: z.literal("°C"),
    precipitation_sum: z.literal("mm"),
    precipitation_probability_max: z.literal("%"),
  }),
  daily: z
    .object({
      time: z.array(localDate),
      weather_code: z.array(wmoCode.nullable()),
      temperature_2m_max: z.array(temperature.nullable()),
      temperature_2m_min: z.array(temperature.nullable()),
      precipitation_sum: z.array(nonNegative.nullable()),
      precipitation_probability_max: z.array(percent.nullable()),
    })
    .superRefine(sameLength),
});

export type OpenMeteoResponse = z.infer<typeof openMeteoResponseSchema>;

// --- Erros --------------------------------------------------------------------

export type ProviderErrorKind = "timeout" | "network" | "http" | "invalid-response";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }

  /** Vale tentar de novo? Erros 4xx (exceto 429) e resposta inválida não. */
  get retryable(): boolean {
    if (this.kind === "timeout" || this.kind === "network") return true;
    if (this.kind === "http") return this.status === 429 || (this.status ?? 0) >= 500;
    return false;
  }
}

// --- Chamada ------------------------------------------------------------------

export function parseOpenMeteoResponse(json: unknown): OpenMeteoResponse {
  const result = openMeteoResponseSchema.safeParse(json);
  if (!result.success) {
    throw new ProviderError("invalid-response", z.prettifyError(result.error));
  }
  return result.data;
}

type FetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export async function fetchOpenMeteo({
  fetchImpl = fetch,
  timeoutMs = PROVIDER_TIMEOUT_MS,
}: FetchOptions = {}): Promise<OpenMeteoResponse> {
  let response: Response;
  try {
    response = await fetchImpl(buildOpenMeteoUrl(), {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ProviderError("timeout", `sem resposta em ${timeoutMs} ms`);
    }
    throw new ProviderError("network", error instanceof Error ? error.message : String(error));
  }

  if (!response.ok) {
    throw new ProviderError("http", `HTTP ${response.status}`, response.status);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ProviderError("invalid-response", "corpo não é JSON válido");
  }
  return parseOpenMeteoResponse(json);
}
