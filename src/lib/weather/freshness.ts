import { FRESHNESS, LOCATION } from "@/lib/config";
import type { Freshness, WeatherResult, WeatherView } from "@/types/weather";

type Rule = { staleAfterMin: number; expiredAfterMin: number };

const MINUTE_MS = 60_000;

/** Quantas horas os cards de "próximas horas" mostram. */
export const HOURS_AHEAD = 24;

/**
 * Classifica a idade de um dado. Limites inclusivos: exatamente 30 min ainda é
 * "fresh". Horário inválido é tratado como expirado (nunca exibir na dúvida).
 * Horário no futuro (relógios dessincronizados) conta como idade zero.
 */
export function classifyAge(referenceTime: string, now: Date, rule: Rule): Freshness {
  const reference = Date.parse(referenceTime);
  if (Number.isNaN(reference)) {
    return { status: "expired", ageMinutes: null, referenceTime };
  }
  const ageMinutes = Math.max(0, Math.floor((now.getTime() - reference) / MINUTE_MS));
  const status =
    ageMinutes <= rule.staleAfterMin
      ? "fresh"
      : ageMinutes <= rule.expiredAfterMin
        ? "stale"
        : "expired";
  return { status, ageMinutes, referenceTime };
}

/** Data local ("AAAA-MM-DD") em Cascavel, independente do fuso do servidor. */
export function localDate(now: Date, timeZone: string = LOCATION.timezone): string {
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Monta o que pode ser exibido agora:
 * - condições atuais: referência é o horário do modelo (`modelTime`);
 * - previsão: referência é quando buscamos (`fetchedAt`);
 * - expirado → removido; horas já encerradas e dias anteriores → removidos.
 */
export function buildWeatherView({ report, servedFrom }: WeatherResult, now: Date): WeatherView {
  const current = classifyAge(report.meta.modelTime, now, FRESHNESS.current);
  const forecast = classifyAge(report.meta.fetchedAt, now, FRESHNESS.forecast);
  const forecastUsable = forecast.status !== "expired";
  const today = localDate(now);
  // Chuva e probabilidade horárias do Open-Meteo referem-se à hora ANTERIOR
  // (o ponto das 16:00 cobre 15:00–16:00). Às 15:40, o primeiro ponto útil é o das 16:00.
  const ahead = forecastUsable ? report.hourly.filter((point) => Date.parse(point.time) > now.getTime()) : [];

  return {
    location: report.location,
    servedFrom,
    freshness: { current, forecast },
    current: current.status === "expired" ? null : report.current,
    hourly: ahead.slice(0, HOURS_AHEAD),
    hourlyAhead: ahead,
    daily: forecastUsable ? report.daily.filter((day) => day.date >= today) : [],
    meta: report.meta,
  };
}
