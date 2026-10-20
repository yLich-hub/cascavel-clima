import type { Freshness, ServedFrom } from "@/types/weather";

/**
 * Dados do El Niño (ENOS) vindos do NOAA Climate Prediction Center.
 * Valores sempre como publicados: anomalia em °C em relação à média 1991–2020.
 */

export type NinoRegionId = "nino12" | "nino3" | "nino34" | "nino4";

export type NinoRegionValue = { sstC: number; anomalyC: number };

/** Uma semana do arquivo semanal (média da semana centrada em `weekCenter`). */
export type WeeklyNino = {
  /** Data central da semana, AAAA-MM-DD. */
  weekCenter: string;
  regions: Record<NinoRegionId, NinoRegionValue>;
};

export type Season =
  | "DJF" | "JFM" | "FMA" | "MAM" | "AMJ" | "MJJ"
  | "JJA" | "JAS" | "ASO" | "SON" | "OND" | "NDJ";

/**
 * Um trimestre móvel do RONI (Relative Oceanic Niño Index), o índice que o
 * boletim do CPC usa. No arquivo, o ano é o do mês central (DJF 2026 = dez/2025–fev/2026).
 */
export type RoniPoint = {
  season: Season;
  year: number;
  /** Mês central do trimestre, AAAA-MM. */
  centerMonth: string;
  anomalyC: number;
};

/** Situação no sistema de alerta do ENOS do NOAA (ENSO Alert System). */
export type EnsoAlertStatus =
  | "not-active"
  | "el-nino-watch"
  | "el-nino-advisory"
  | "final-el-nino-advisory"
  | "la-nina-watch"
  | "la-nina-advisory"
  | "final-la-nina-advisory";

export type EnsoDiscussion = {
  /** Data de emissão do boletim, AAAA-MM-DD. */
  issuedOn: string;
  /** Pode haver dois ao mesmo tempo (ex.: "Final El Niño Advisory / La Niña Watch"). */
  statuses: EnsoAlertStatus[];
};

type Meta = { fetchedAt: string; sourceUrl: string };

export type WeeklyNinoReport = { weeks: WeeklyNino[]; meta: Meta };
export type RoniReport = { points: RoniPoint[]; meta: Meta };
export type DiscussionReport = { discussion: EnsoDiscussion; meta: Meta };

/**
 * Uma parte dos dados do El Niño pronta para exibir, ou o motivo de não estar:
 * - "unavailable": o provedor falhou e não há dado anterior;
 * - "expired": há dado, mas velho demais para exibir (ENSO_FRESHNESS_DAYS).
 */
export type EnsoPart<T> =
  | { available: true; report: T; servedFrom: ServedFrom; freshness: Freshness }
  | { available: false; reason: "unavailable" }
  | { available: false; reason: "expired"; freshness: Freshness };

export type EnsoView = {
  weekly: EnsoPart<WeeklyNinoReport>;
  roni: EnsoPart<RoniReport>;
  discussion: EnsoPart<DiscussionReport>;
};
