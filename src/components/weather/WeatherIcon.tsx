import {
  CircleHelp,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudMoonRain,
  CloudRain,
  CloudSnow,
  CloudSun,
  CloudSunRain,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { describeWeatherCode, type WeatherIcon as IconKey } from "@/lib/weather/wmo-codes";

const ICONS: Record<IconKey, { day: LucideIcon; night: LucideIcon }> = {
  clear: { day: Sun, night: Moon },
  "partly-cloudy": { day: CloudSun, night: CloudMoon },
  cloudy: { day: Cloud, night: Cloud },
  fog: { day: CloudFog, night: CloudFog },
  drizzle: { day: CloudDrizzle, night: CloudDrizzle },
  rain: { day: CloudRain, night: CloudRain },
  "freezing-rain": { day: CloudHail, night: CloudHail },
  snow: { day: CloudSnow, night: CloudSnow },
  showers: { day: CloudSunRain, night: CloudMoonRain },
  thunderstorm: { day: CloudLightning, night: CloudLightning },
  unknown: { day: CircleHelp, night: CircleHelp },
};

type Props = {
  code: number | null;
  /** null = desconhecido; usa a versão diurna. */
  isDay: boolean | null;
  className?: string;
};

/** Ícone decorativo: a descrição em texto deve estar visível ou em `sr-only` ao lado. */
export function WeatherIcon({ code, isDay, className }: Props) {
  const { icon } = describeWeatherCode(code);
  const Icon = isDay === false ? ICONS[icon].night : ICONS[icon].day;
  return <Icon aria-hidden="true" className={className} strokeWidth={1.75} />;
}
