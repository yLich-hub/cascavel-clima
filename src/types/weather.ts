/**
 * Modelo interno, independente do provedor. Horários locais vêm como ISO 8601
 * com offset explícito (ex.: "2026-10-14T15:00-03:00"); datas como "AAAA-MM-DD".
 *
 * `null` significa "o provedor não informou": a interface mostra "—", nunca 0.
 */

export type Location = {
  name: string;
  state: string;
  lat: number;
  lon: number;
  timezone: string;
};

export type DataMeta = {
  source: "open-meteo";
  /** Quando NÓS buscamos o dado (ISO UTC). Base do cálculo de frescor. */
  fetchedAt: string;
  /** Horário a que as condições atuais se referem (ISO com offset). */
  modelTime: string;
  /** Célula do modelo usada pelo provedor (pode ficar a alguns km da cidade). */
  grid: { lat: number; lon: number; elevationM: number };
  attribution: { text: string; url: string; license: string; licenseUrl: string };
};

/** Estimativa de modelo numérico, não medição de estação. */
export type CurrentConditions = {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  weatherCode: number;
  isDay: boolean;
};

export type HourlyPoint = {
  time: string;
  temperatureC: number | null;
  precipitationProbPct: number | null;
  precipitationMm: number | null;
  weatherCode: number | null;
  isDay: boolean | null;
};

export type DailyPoint = {
  date: string;
  minC: number | null;
  maxC: number | null;
  precipitationSumMm: number | null;
  precipitationProbMaxPct: number | null;
  weatherCode: number | null;
};

export type WeatherReport = {
  location: Location;
  current: CurrentConditions;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  meta: DataMeta;
};

/** "live": buscado agora; "fallback": provedor falhou e usamos o último dado bom. */
export type ServedFrom = "live" | "fallback";

export type WeatherResult = {
  report: WeatherReport;
  servedFrom: ServedFrom;
};

export type FreshnessStatus = "fresh" | "stale" | "expired";

export type Freshness = {
  status: FreshnessStatus;
  /** Idade em minutos no momento da requisição; null se o horário de referência for inválido. */
  ageMinutes: number | null;
  /** Horário usado no cálculo (ISO). */
  referenceTime: string;
};

/**
 * O que o site e o /api/weather entregam. Calculado a cada requisição:
 * dado expirado some (null / lista vazia), horas e dias já passados são removidos.
 */
export type WeatherView = {
  location: Location;
  servedFrom: ServedFrom;
  freshness: { current: Freshness; forecast: Freshness };
  current: CurrentConditions | null;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  meta: DataMeta;
};
