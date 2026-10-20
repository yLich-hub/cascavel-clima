import { formatPct, formatTemp, formatWindSpeed, windCardinal } from "@/lib/format";
import type { CurrentConditions, HourlyPoint } from "@/types/weather";

/**
 * Leituras derivadas dos dados para os widgets da Início. Tudo aqui descreve
 * dados; nada é aviso ou alerta (o site não emite alertas).
 */

export type UvLevel = "baixo" | "moderado" | "alto" | "muito alto" | "extremo";

/**
 * Faixas do Índice UV da OMS (Global Solar UV Index): 0–2 baixo, 3–5 moderado,
 * 6–7 alto, 8–10 muito alto, 11+ extremo. O índice é publicado como inteiro,
 * então o valor do modelo é arredondado antes de classificar.
 */
export function uvCategory(index: number | null): { value: number; level: UvLevel } | null {
  if (index === null) return null;
  const value = Math.max(0, Math.round(index));
  const level: UvLevel =
    value <= 2 ? "baixo" : value <= 5 ? "moderado" : value <= 7 ? "alto" : value <= 10 ? "muito alto" : "extremo";
  return { value, level };
}

export type SunProgress =
  | { state: "before"; fraction: 0 }
  | { state: "day"; fraction: number }
  | { state: "after"; fraction: 1 };

/** Posição do sol entre o nascer (0) e o pôr (1). */
export function sunProgress(now: Date, sunrise: string | null, sunset: string | null): SunProgress | null {
  if (!sunrise || !sunset) return null;
  const rise = Date.parse(sunrise);
  const set = Date.parse(sunset);
  if (Number.isNaN(rise) || Number.isNaN(set) || set <= rise) return null;
  const t = now.getTime();
  if (t < rise) return { state: "before", fraction: 0 };
  if (t > set) return { state: "after", fraction: 1 };
  return { state: "day", fraction: (t - rise) / (set - rise) };
}

export type Twilight = "dawn" | "dusk";

/** Minutos antes e depois do nascer/pôr do sol em que a cena fica com cores de amanhecer/entardecer. */
export const TWILIGHT_WINDOW_MIN = 40;

/**
 * Amanhecer ou entardecer agora? Usa os horários de nascer e pôr do sol do
 * dia (Open-Meteo). Só muda as cores da cena; não diz nada sobre o tempo.
 */
export function twilightAt(now: Date, sunrise: string | null, sunset: string | null): Twilight | null {
  if (!sunrise || !sunset) return null;
  const window = TWILIGHT_WINDOW_MIN * 60_000;
  const t = now.getTime();
  const near = (iso: string) => {
    const at = Date.parse(iso);
    return !Number.isNaN(at) && Math.abs(t - at) <= window;
  };
  if (near(sunrise)) return "dawn";
  if (near(sunset)) return "dusk";
  return null;
}

/** Frase da Início feita só com os dados (sem adjetivos de risco). */
export function describeNow(current: CurrentConditions, hourly: HourlyPoint[]): string {
  const wind = windCardinal(current.windDirectionDeg);
  const parts = [
    `Sensação térmica de ${formatTemp(current.apparentTemperatureC)}, umidade de ${formatPct(
      current.humidityPct,
    )} e vento de ${wind.short} a ${formatWindSpeed(current.windSpeedKmh)}.`,
  ];
  const probabilities = hourly
    .map((point) => point.precipitationProbPct)
    .filter((value): value is number => value !== null);
  if (probabilities.length > 0) {
    parts.push(
      `Chance de chuva de até ${formatPct(Math.max(...probabilities))} nas próximas ${hourly.length} horas.`,
    );
  }
  return parts.join(" ");
}

/** Mínimo, máximo e horário do máximo do vento previsto (ignora horas sem dado). */
export function windRange(hourly: HourlyPoint[]): { min: number; max: number; maxAt: string } | null {
  const points = hourly.filter((point): point is HourlyPoint & { windSpeedKmh: number } => point.windSpeedKmh !== null);
  if (points.length === 0) return null;
  const top = points.reduce((best, point) => (point.windSpeedKmh > best.windSpeedKmh ? point : best));
  return {
    min: Math.min(...points.map((point) => point.windSpeedKmh)),
    max: top.windSpeedKmh,
    maxAt: top.time,
  };
}
