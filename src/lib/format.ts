import { LOCATION } from "@/lib/config";

/**
 * Formatação para exibição em pt-BR. Todo horário é formatado no fuso de
 * Cascavel explicitamente — nunca no fuso do servidor (UTC na Vercel) nem no
 * do navegador do visitante. Valor ausente (null) vira "—", nunca 0.
 */

const MISSING = "—";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: LOCATION.timezone,
  hour: "2-digit",
  minute: "2-digit",
});

const hourFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: LOCATION.timezone,
  hour: "2-digit",
  hourCycle: "h23",
});

// Datas "AAAA-MM-DD" não têm fuso: interpretamos ao meio-dia UTC e formatamos em UTC.
const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short" });
const weekdayLongFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" });
const dayMonthFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
});

const dateOnly = (date: string) => new Date(`${date}T12:00:00Z`);
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "2026-10-14T15:30-03:00" → "15:30" */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** "2026-10-14T15:00-03:00" → "15h" */
export function formatHour(iso: string): string {
  return `${hourFormatter.format(new Date(iso))}h`;
}

function addDays(date: string, days: number): string {
  const next = dateOnly(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Rótulo curto do dia: "Hoje", "Amanhã" ou "Qua". `today` é a data local de Cascavel. */
export function formatDayLabel(date: string, today: string): string {
  if (date === today) return "Hoje";
  if (date === addDays(today, 1)) return "Amanhã";
  return capitalize(weekdayFormatter.format(dateOnly(date)).replace(".", ""));
}

/** "2026-10-08" → "08/10/2026" */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateOnly(date));
}

/** Nome completo para leitores de tela: "quarta-feira, 14/10". */
export function formatDayLong(date: string): string {
  const day = dateOnly(date);
  return `${weekdayLongFormatter.format(day)}, ${dayMonthFormatter.format(day)}`;
}

export function formatTemp(celsius: number | null): string {
  if (celsius === null) return MISSING;
  // `|| 0` evita exibir "-0°" ao arredondar valores como -0,4.
  return `${Math.round(celsius) || 0}°`;
}

export function formatMm(mm: number | null): string {
  if (mm === null) return MISSING;
  return `${mm.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm`;
}

export function formatPct(pct: number | null): string {
  if (pct === null) return MISSING;
  return `${Math.round(pct)}%`;
}

export function formatWindSpeed(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

const CARDINALS = [
  { short: "N", long: "norte" },
  { short: "NE", long: "nordeste" },
  { short: "L", long: "leste" },
  { short: "SE", long: "sudeste" },
  { short: "S", long: "sul" },
  { short: "SO", long: "sudoeste" },
  { short: "O", long: "oeste" },
  { short: "NO", long: "noroeste" },
] as const;

/** Direção DE ONDE o vento sopra (convenção meteorológica), em 8 pontos. */
export function windCardinal(degrees: number): (typeof CARDINALS)[number] {
  const normalized = ((degrees % 360) + 360) % 360;
  return CARDINALS[Math.round(normalized / 45) % 8];
}

/** 0 → "agora", 8 → "há 8 min", 130 → "há 2 h 10 min". */
export function formatAge(minutes: number | null): string {
  if (minutes === null) return "horário desconhecido";
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `há ${hours} h` : `há ${hours} h ${rest} min`;
}
