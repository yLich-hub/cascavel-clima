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
  /** Velocidade média do vento a 10 m, no instante indicado. */
  windSpeedKmh: number | null;
};

export type DailyPoint = {
  date: string;
  minC: number | null;
  maxC: number | null;
  precipitationSumMm: number | null;
  precipitationProbMaxPct: number | null;
  weatherCode: number | null;
  /** ISO com offset (ex.: "2026-10-15T05:59-03:00"). */
  sunrise: string | null;
  sunset: string | null;
  /** Índice UV máximo previsto para o dia (adimensional). */
  uvIndexMax: number | null;
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

/**
 * Por que o provedor falhou na última tentativa (só com servedFrom "fallback").
 * Vai para /api/weather e /api/enso para o monitor dizer o motivo sem abrir os logs.
 */
export type ProviderFailure = {
  kind: "timeout" | "network" | "http" | "invalid-response";
  /** Código HTTP, quando houver (ex.: 429 = limite de uso do provedor). */
  status?: number;
  /** Mensagem curta do erro (sem dados sensíveis: não há chaves neste projeto). */
  message: string;
  /** Quando a tentativa falhou (ISO). */
  at: string;
};

export type WeatherResult = {
  report: WeatherReport;
  servedFrom: ServedFrom;
  failure?: ProviderFailure;
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
  /** Só quando servedFrom é "fallback": motivo da falha da última busca. */
  failure?: ProviderFailure;
  freshness: { current: Freshness; forecast: Freshness };
  current: CurrentConditions | null;
  /** Próximas 24 h (cards de horas, vento e resumo). */
  hourly: HourlyPoint[];
  /** Todas as horas ainda por vir, até o fim do 7º dia (detalhe de cada dia). */
  hourlyAhead: HourlyPoint[];
  daily: DailyPoint[];
  meta: DataMeta;
};
