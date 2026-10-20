import "server-only";
import { ProviderError, requestText, type FetchOptions } from "@/lib/providers/http";
import type {
  EnsoAlertStatus,
  EnsoDiscussion,
  NinoRegionId,
  RoniPoint,
  Season,
  WeeklyNino,
} from "@/types/enso";

/**
 * Cliente do NOAA Climate Prediction Center (dados públicos do governo dos EUA,
 * sem chave). São arquivos de texto e uma página HTML, não uma API: os
 * parsers abaixo são estritos e, se o formato mudar, falham com
 * "invalid-response" em vez de exibir número errado.
 *
 * Frequência de publicação (conferida em 20/10/2026):
 * - semanal (segundas-feiras): temperatura do mar nas regiões Niño;
 * - mensal (início do mês): RONI, o índice trimestral que o boletim usa;
 * - mensal (segunda quinta-feira): boletim "ENSO Diagnostic Discussion".
 */

export const CPC_URLS = {
  weekly: "https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for",
  roni: "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt",
  discussion: "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml",
} as const;

/** Quanto do histórico guardar: o suficiente para os gráficos, sem pesar no cache. */
export const KEEP_WEEKS = 52;
export const KEEP_SEASONS = 48;

const invalid = (message: string) => new ProviderError("invalid-response", message);

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const pad = (n: number) => String(n).padStart(2, "0");

/** AAAA-MM-DD, recusando datas inexistentes (ex.: 31/02). */
function isoDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw invalid(`data inexistente: ${year}-${month}-${day}`);
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

// --- Semanal: wksst9120.for ---------------------------------------------------

const REGION_ORDER: NinoRegionId[] = ["nino12", "nino3", "nino34", "nino4"];
// " 14OCT2026     26.2 5.2     29.2 4.2     30.0 3.3     29.7 1.1"
// Valores negativos colam no anterior ("20.6-0.1"), por isso a extração por número.
const WEEK_LINE = /^\s*(\d{2})([A-Z]{3})(\d{4})\s+(.+)$/;
const NUMBER = /-?\d+\.\d/g;

export function parseWeeklyNino(text: string): WeeklyNino[] {
  if (!/Nino1\+2\s+Nino3\s+Nino34\s+Nino4/.test(text)) {
    throw invalid("cabeçalho do arquivo semanal não encontrado");
  }

  const weeks: WeeklyNino[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = WEEK_LINE.exec(line);
    if (!match) continue;
    const [, day, monthName, year, rest] = match;
    const month = MONTHS.indexOf(monthName) + 1;
    if (month === 0) throw invalid(`mês desconhecido: ${monthName}`);

    const numbers = rest.match(NUMBER)?.map(Number) ?? [];
    if (numbers.length !== 8) throw invalid(`linha semanal com ${numbers.length} valores: "${line.trim()}"`);

    const regions = {} as WeeklyNino["regions"];
    REGION_ORDER.forEach((id, i) => {
      const sstC = numbers[i * 2];
      const anomalyC = numbers[i * 2 + 1];
      if (sstC < 10 || sstC > 35) throw invalid(`temperatura fora da faixa: ${sstC}`);
      if (anomalyC < -6 || anomalyC > 8) throw invalid(`anomalia fora da faixa: ${anomalyC}`);
      regions[id] = { sstC, anomalyC };
    });

    const weekCenter = isoDate(Number(year), month, Number(day));
    const previous = weeks.at(-1);
    if (previous && weekCenter <= previous.weekCenter) {
      throw invalid(`semanas fora de ordem: ${previous.weekCenter} → ${weekCenter}`);
    }
    weeks.push({ weekCenter, regions });
  }

  if (weeks.length === 0) throw invalid("nenhuma semana no arquivo");
  return weeks.slice(-KEEP_WEEKS);
}

// --- Mensal: RONI.ascii.txt ---------------------------------------------------

const SEASONS: Season[] = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"];
const RONI_LINE = /^\s*([A-Z]{3})\s+(\d{4})\s+(-?\d+\.\d+)\s*$/;

export function parseRoni(text: string): RoniPoint[] {
  if (!/SEAS\s+YR\s+ANOM/.test(text)) throw invalid("cabeçalho do RONI não encontrado");

  const points: RoniPoint[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = RONI_LINE.exec(line);
    if (!match) continue;
    const [, seasonName, yearText, anomalyText] = match;
    const index = SEASONS.indexOf(seasonName as Season);
    if (index === -1) throw invalid(`trimestre desconhecido: ${seasonName}`);
    const year = Number(yearText);
    const anomalyC = Number(anomalyText);
    if (anomalyC < -4 || anomalyC > 4) throw invalid(`RONI fora da faixa: ${anomalyC}`);

    // Cada linha precisa ser o trimestre seguinte ao anterior (sem buracos nem repetições).
    const previous = points.at(-1);
    if (previous) {
      const prevIndex = SEASONS.indexOf(previous.season);
      const expectedYear = prevIndex === SEASONS.length - 1 ? previous.year + 1 : previous.year;
      if (index !== (prevIndex + 1) % SEASONS.length || year !== expectedYear) {
        throw invalid(`RONI fora de sequência: ${previous.season} ${previous.year} → ${seasonName} ${year}`);
      }
    }
    points.push({ season: SEASONS[index], year, centerMonth: `${year}-${pad(index + 1)}`, anomalyC });
  }

  if (points.length === 0) throw invalid("nenhum valor de RONI no arquivo");
  return points.slice(-KEEP_SEASONS);
}

// --- Boletim mensal: ensodisc.shtml -------------------------------------------

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  ntilde: "ñ", Ntilde: "Ñ", deg: "°", ndash: "–", mdash: "—",
};

function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => ENTITIES[name] ?? entity)
    .replace(/\s+/g, " ");
}

const ENGLISH_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const STATUS_NAMES: Record<string, EnsoAlertStatus> = {
  "not active": "not-active",
  "el nino watch": "el-nino-watch",
  "el nino advisory": "el-nino-advisory",
  "final el nino advisory": "final-el-nino-advisory",
  "la nina watch": "la-nina-watch",
  "la nina advisory": "la-nina-advisory",
  "final la nina advisory": "final-la-nina-advisory",
};

const simplify = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

export function parseDiscussion(html: string): EnsoDiscussion {
  const text = htmlToText(html);

  const date = /issued by CLIMATE PREDICTION CENTER\/NCEP\/NWS (\d{1,2}) ([A-Za-z]+) (\d{4})/i.exec(text);
  if (!date) throw invalid("data de emissão do boletim não encontrada");
  const month = ENGLISH_MONTHS.indexOf(date[2].toLowerCase()) + 1;
  if (month === 0) throw invalid(`mês desconhecido no boletim: ${date[2]}`);
  const issuedOn = isoDate(Number(date[3]), month, Number(date[1]));

  const status = /ENSO Alert System Status: (.+?) Synopsis:/i.exec(text);
  if (!status) throw invalid("situação do sistema de alerta não encontrada");
  const statuses = status[1].split(/\s*\/\s*|\s+and\s+/i).map((part) => {
    const id = STATUS_NAMES[simplify(part)];
    if (!id) throw invalid(`situação desconhecida no boletim: "${part}"`);
    return id;
  });

  return { issuedOn, statuses };
}

// --- Chamadas -----------------------------------------------------------------

export const fetchWeeklyNino = (options: FetchOptions = {}) =>
  requestText(CPC_URLS.weekly, { ...options, accept: "text/plain" }).then(parseWeeklyNino);

export const fetchRoni = (options: FetchOptions = {}) =>
  requestText(CPC_URLS.roni, { ...options, accept: "text/plain" }).then(parseRoni);

export const fetchDiscussion = (options: FetchOptions = {}) =>
  requestText(CPC_URLS.discussion, { ...options, accept: "text/html" }).then(parseDiscussion);
