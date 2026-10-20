import "server-only";
import { z } from "zod";
import { LOCATION } from "@/lib/config";
import { ProviderError, request, type FetchOptions } from "@/lib/providers/http";

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
  "wind_speed_10m",
] as const;

const DAILY_VARS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "sunrise",
  "sunset",
  "uv_index_max",
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
    // Sem forecast_hours: a série horária cobre os 7 dias inteiros (00h de hoje até 23h do 7º dia),
    // usada no detalhe de cada dia. Os cards de "próximas horas" recortam 24 h em freshness.ts.
    forecast_days: "7",
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
// Índice UV é adimensional; acima de 11 já é "extremo", mas pode passar disso.
const uvIndex = z.number().min(0).max(25);

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
    wind_speed_10m: z.literal("km/h"),
  }),
  hourly: z
    .object({
      time: z.array(localDateTime),
      temperature_2m: z.array(temperature.nullable()),
      precipitation_probability: z.array(percent.nullable()),
      precipitation: z.array(nonNegative.nullable()),
      weather_code: z.array(wmoCode.nullable()),
      is_day: z.array(flag.nullable()),
      wind_speed_10m: z.array(nonNegative.nullable()),
    })
    .superRefine(sameLength),

  daily_units: z.object({
    temperature_2m_max: z.literal("°C"),
    temperature_2m_min: z.literal("°C"),
    precipitation_sum: z.literal("mm"),
    precipitation_probability_max: z.literal("%"),
    sunrise: z.literal("iso8601"),
    sunset: z.literal("iso8601"),
    uv_index_max: z.literal(""),
  }),
  daily: z
    .object({
      time: z.array(localDate),
      weather_code: z.array(wmoCode.nullable()),
      temperature_2m_max: z.array(temperature.nullable()),
      temperature_2m_min: z.array(temperature.nullable()),
      precipitation_sum: z.array(nonNegative.nullable()),
      precipitation_probability_max: z.array(percent.nullable()),
      sunrise: z.array(localDateTime.nullable()),
      sunset: z.array(localDateTime.nullable()),
      uv_index_max: z.array(uvIndex.nullable()),
    })
    .superRefine(sameLength),
});

export type OpenMeteoResponse = z.infer<typeof openMeteoResponseSchema>;

// --- Erros --------------------------------------------------------------------

// ProviderError mora em http.ts (comum a todos os provedores); reexportado aqui por compatibilidade.
export { ProviderError, type ProviderErrorKind } from "@/lib/providers/http";

// --- Chamada ------------------------------------------------------------------

export function parseOpenMeteoResponse(json: unknown): OpenMeteoResponse {
  const result = openMeteoResponseSchema.safeParse(json);
  if (!result.success) {
    throw new ProviderError("invalid-response", z.prettifyError(result.error));
  }
  return result.data;
}

export async function fetchOpenMeteo(options: FetchOptions = {}): Promise<OpenMeteoResponse> {
  const response = await request(buildOpenMeteoUrl(), { ...options, accept: "application/json" });
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ProviderError("invalid-response", "corpo não é JSON válido");
  }
  return parseOpenMeteoResponse(json);
}
