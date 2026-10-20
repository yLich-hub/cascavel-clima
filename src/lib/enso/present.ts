import type { EnsoAlertStatus, NinoRegionId, RoniPoint } from "@/types/enso";

/**
 * Textos e cores para exibir os dados do El Niño. Os significados das situações
 * seguem a definição do próprio NOAA (ENSO Alert System, ver STATUS_SOURCE_URL);
 * nada aqui é inferido a partir dos números.
 */

export const STATUS_SOURCE_URL =
  "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/enso-alert-readme.shtml";
export const RONI_SOURCE_URL = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/";

export type StatusTone = "warm" | "cool" | "neutral";

export const STATUS_TEXT: Record<
  EnsoAlertStatus,
  { label: string; official: string; meaning: string; tone: StatusTone }
> = {
  "el-nino-watch": {
    label: "Vigilância de El Niño",
    official: "El Niño Watch",
    meaning: "condições favoráveis para o El Niño se formar nos próximos seis meses",
    tone: "warm",
  },
  "el-nino-advisory": {
    label: "El Niño em curso",
    official: "El Niño Advisory",
    meaning: "condições de El Niño observadas e com expectativa de continuar",
    tone: "warm",
  },
  "final-el-nino-advisory": {
    label: "Fim do El Niño",
    official: "Final El Niño Advisory",
    meaning: "as condições de El Niño terminaram",
    tone: "neutral",
  },
  "la-nina-watch": {
    label: "Vigilância de La Niña",
    official: "La Niña Watch",
    meaning: "condições favoráveis para a La Niña se formar nos próximos seis meses",
    tone: "cool",
  },
  "la-nina-advisory": {
    label: "La Niña em curso",
    official: "La Niña Advisory",
    meaning: "condições de La Niña observadas e com expectativa de continuar",
    tone: "cool",
  },
  "final-la-nina-advisory": {
    label: "Fim da La Niña",
    official: "Final La Niña Advisory",
    meaning: "as condições de La Niña terminaram",
    tone: "neutral",
  },
  "not-active": {
    label: "Sistema de alerta inativo",
    official: "Not Active",
    meaning: "o NOAA não emitiu vigilância nem aviso de El Niño ou La Niña",
    tone: "neutral",
  },
};

/** Regiões oficiais do NOAA (longitudes em graus Leste, 0–360). */
export const NINO_REGIONS: Record<
  NinoRegionId,
  { name: string; where: string; lat: [number, number]; lon: [number, number] }
> = {
  nino4: { name: "Niño 4", where: "Pacífico central-oeste", lat: [-5, 5], lon: [160, 210] },
  nino34: { name: "Niño 3.4", where: "Pacífico central (região de referência)", lat: [-5, 5], lon: [190, 240] },
  nino3: { name: "Niño 3", where: "Pacífico central-leste", lat: [-5, 5], lon: [210, 270] },
  nino12: { name: "Niño 1+2", where: "costa do Peru e do Equador", lat: [-10, 0], lon: [270, 280] },
};

/** Limite do NOAA para condições de El Niño (+) e La Niña (−), em °C. */
export const THRESHOLD_C = 0.5;

const number = (digits: number) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** "+3,3 °C", "−0,8 °C", "0,0 °C" (sem "-0,0"). Casas decimais como publicadas. */
export function formatAnomaly(value: number, digits = 1): string {
  const rounded = Number(value.toFixed(digits));
  const abs = number(digits).format(Math.abs(rounded));
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${abs} °C`;
}

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Trimestre do RONI por extenso: JAS 2026 → "jul–set/2026"; DJF 2026 → "dez/2025–fev/2026". */
export function formatSeason({ centerMonth }: Pick<RoniPoint, "centerMonth">): string {
  const [year, month] = centerMonth.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 2, 1));
  const last = new Date(Date.UTC(year, month, 1));
  const name = (d: Date) => MONTHS_SHORT[d.getUTCMonth()];
  return first.getUTCFullYear() === last.getUTCFullYear()
    ? `${name(first)}–${name(last)}/${last.getUTCFullYear()}`
    : `${name(first)}/${first.getUTCFullYear()}–${name(last)}/${last.getUTCFullYear()}`;
}

/**
 * Par divergente quente/frio validado para o fundo escuro do site
 * (ver tests/enso-present.test.ts): vermelho = acima da média, azul = abaixo.
 */
export const DIVERGING = { warm: "#e66767", cool: "#3987e5", neutral: "#94a3b8" } as const;

/** Cor da marca de um valor: quente/frio a partir do limite de ±0,5 °C, neutro no meio. */
export function anomalyTone(value: number): StatusTone {
  return value >= THRESHOLD_C ? "warm" : value <= -THRESHOLD_C ? "cool" : "neutral";
}

export const toneColor = (tone: StatusTone) => DIVERGING[tone];

/**
 * Intensidade da "mancha quente" da ilustração de oceano (0 a 1), proporcional
 * ao valor semanal do Niño 3.4 até +3 °C. Abaixo de 0 a mancha não aparece.
 */
export function oceanWarmth(nino34AnomalyC: number | null): number {
  if (nino34AnomalyC === null) return 0;
  return Math.min(1, Math.max(0, nino34AnomalyC / 3));
}
