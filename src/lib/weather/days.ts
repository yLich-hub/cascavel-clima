import { LOCATION } from "@/lib/config";
import { localDate } from "@/lib/weather/freshness";
import type { DailyPoint, HourlyPoint } from "@/types/weather";

/** Uma hora do detalhe do dia: o intervalo que TERMINA no horário do ponto. */
export type HourSlot = {
  /** Horário do ponto (fim do intervalo), ISO com fuso. */
  time: string;
  /** Hora de início do intervalo (0–23), no fuso de Cascavel. */
  startHour: number;
  precipitationMm: number | null;
  precipitationProbPct: number | null;
  temperatureC: number | null;
  weatherCode: number | null;
};

export type DayDetail = {
  date: string;
  minC: number | null;
  maxC: number | null;
  precipitationSumMm: number | null;
  precipitationProbMaxPct: number | null;
  hours: HourSlot[];
};

const HOUR_MS = 60 * 60 * 1000;
const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: LOCATION.timezone, hour: "numeric", hourCycle: "h23" });

/**
 * Agrupa as horas pelo dia em que o intervalo COMEÇA. O Open-Meteo informa a
 * chuva da hora anterior: o ponto das 00:00 do dia 21 é a chuva das 23h–24h
 * do dia 20, então pertence ao dia 20.
 */
export function hoursByDay(points: HourlyPoint[]): Map<string, HourSlot[]> {
  const days = new Map<string, HourSlot[]>();
  for (const point of points) {
    const start = new Date(Date.parse(point.time) - HOUR_MS);
    if (Number.isNaN(start.getTime())) continue;
    const date = localDate(start);
    const slot: HourSlot = {
      time: point.time,
      startHour: Number(hourFormatter.format(start)),
      precipitationMm: point.precipitationMm,
      precipitationProbPct: point.precipitationProbPct,
      temperatureC: point.temperatureC,
      weatherCode: point.weatherCode,
    };
    days.set(date, [...(days.get(date) ?? []), slot]);
  }
  return days;
}

/** Junta o resumo diário com as horas ainda por vir de cada dia. */
export function dayDetails(daily: DailyPoint[], hourlyAhead: HourlyPoint[]): DayDetail[] {
  const hours = hoursByDay(hourlyAhead);
  return daily.map((day) => ({
    date: day.date,
    minC: day.minC,
    maxC: day.maxC,
    precipitationSumMm: day.precipitationSumMm,
    precipitationProbMaxPct: day.precipitationProbMaxPct,
    hours: hours.get(day.date) ?? [],
  }));
}

/** Teto "redondo" do eixo da chuva por hora, no mínimo 1 mm (garoa não vira barra gigante). */
export function rainAxisMax(values: Array<number | null>): number {
  const max = Math.max(0, ...values.filter((v): v is number => v !== null));
  if (max <= 1) return 1;
  if (max <= 2) return 2;
  if (max <= 5) return 5;
  if (max <= 10) return 10;
  return Math.ceil(max / 10) * 10;
}
