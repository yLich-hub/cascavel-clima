/**
 * Códigos WMO de tempo presente usados pelo Open-Meteo
 * (tabela "WMO Weather interpretation codes" em https://open-meteo.com/en/docs).
 * Códigos 96 e 99 (granizo) só aparecem em modelos com previsão explícita de granizo.
 */

export type WeatherIcon =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "showers"
  | "thunderstorm"
  | "unknown";

type Entry = { label: string; icon: WeatherIcon };

const WMO_CODES: Record<number, Entry> = {
  0: { label: "Céu limpo", icon: "clear" },
  1: { label: "Predominantemente limpo", icon: "clear" },
  2: { label: "Parcialmente nublado", icon: "partly-cloudy" },
  3: { label: "Nublado", icon: "cloudy" },
  45: { label: "Nevoeiro", icon: "fog" },
  48: { label: "Nevoeiro com geada", icon: "fog" },
  51: { label: "Garoa fraca", icon: "drizzle" },
  53: { label: "Garoa moderada", icon: "drizzle" },
  55: { label: "Garoa intensa", icon: "drizzle" },
  56: { label: "Garoa congelante fraca", icon: "freezing-rain" },
  57: { label: "Garoa congelante intensa", icon: "freezing-rain" },
  61: { label: "Chuva fraca", icon: "rain" },
  63: { label: "Chuva moderada", icon: "rain" },
  65: { label: "Chuva forte", icon: "rain" },
  66: { label: "Chuva congelante fraca", icon: "freezing-rain" },
  67: { label: "Chuva congelante forte", icon: "freezing-rain" },
  71: { label: "Neve fraca", icon: "snow" },
  73: { label: "Neve moderada", icon: "snow" },
  75: { label: "Neve forte", icon: "snow" },
  77: { label: "Grãos de neve", icon: "snow" },
  80: { label: "Pancadas de chuva fracas", icon: "showers" },
  81: { label: "Pancadas de chuva moderadas", icon: "showers" },
  82: { label: "Pancadas de chuva muito fortes", icon: "showers" },
  85: { label: "Pancadas de neve fracas", icon: "snow" },
  86: { label: "Pancadas de neve fortes", icon: "snow" },
  95: { label: "Trovoada", icon: "thunderstorm" },
  96: { label: "Trovoada com granizo fraco", icon: "thunderstorm" },
  97: { label: "Trovoada forte", icon: "thunderstorm" },
  99: { label: "Trovoada com granizo forte", icon: "thunderstorm" },
};

/** Descrição em PT-BR. Código ausente ou fora da tabela não é "adivinhado". */
export function describeWeatherCode(code: number | null): Entry {
  if (code === null) return { label: "Sem informação", icon: "unknown" };
  return WMO_CODES[code] ?? { label: "Condição não reconhecida", icon: "unknown" };
}
