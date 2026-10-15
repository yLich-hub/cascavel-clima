import { ATTRIBUTION, LOCATION } from "@/lib/config";
import type { OpenMeteoResponse } from "@/lib/providers/open-meteo";
import type { DailyPoint, HourlyPoint, WeatherReport } from "@/types/weather";

/**
 * "2026-10-14T15:00" + -10800 → "2026-10-14T15:00-03:00".
 *
 * O Open-Meteo devolve horário local sem offset e informa um único
 * `utc_offset_seconds`. Isso é correto enquanto o fuso não tiver horário de
 * verão (o Brasil não tem desde 2019); se voltar a ter, revisar aqui.
 */
export function withOffset(localTime: string, offsetSeconds: number): string {
  const sign = offsetSeconds < 0 ? "-" : "+";
  const abs = Math.abs(offsetSeconds);
  const hh = String(Math.floor(abs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return `${localTime}${sign}${hh}:${mm}`;
}

const toFlag = (value: 0 | 1 | null): boolean | null => (value === null ? null : value === 1);

export function normalizeOpenMeteo(raw: OpenMeteoResponse, fetchedAt: Date): WeatherReport {
  const offset = raw.utc_offset_seconds;
  const { current, hourly, daily } = raw;

  const hourlyPoints: HourlyPoint[] = hourly.time.map((time, i) => ({
    time: withOffset(time, offset),
    temperatureC: hourly.temperature_2m[i],
    precipitationProbPct: hourly.precipitation_probability[i],
    precipitationMm: hourly.precipitation[i],
    weatherCode: hourly.weather_code[i],
    isDay: toFlag(hourly.is_day[i]),
    windSpeedKmh: hourly.wind_speed_10m[i],
  }));

  const localWithOffset = (value: string | null) => (value === null ? null : withOffset(value, offset));

  const dailyPoints: DailyPoint[] = daily.time.map((date, i) => ({
    date,
    minC: daily.temperature_2m_min[i],
    maxC: daily.temperature_2m_max[i],
    precipitationSumMm: daily.precipitation_sum[i],
    precipitationProbMaxPct: daily.precipitation_probability_max[i],
    weatherCode: daily.weather_code[i],
    sunrise: localWithOffset(daily.sunrise[i]),
    sunset: localWithOffset(daily.sunset[i]),
    uvIndexMax: daily.uv_index_max[i],
  }));

  const modelTime = withOffset(current.time, offset);

  return {
    location: {
      name: LOCATION.name,
      state: LOCATION.state,
      lat: LOCATION.lat,
      lon: LOCATION.lon,
      timezone: LOCATION.timezone,
    },
    current: {
      time: modelTime,
      temperatureC: current.temperature_2m,
      apparentTemperatureC: current.apparent_temperature,
      humidityPct: current.relative_humidity_2m,
      precipitationMm: current.precipitation,
      windSpeedKmh: current.wind_speed_10m,
      windDirectionDeg: current.wind_direction_10m,
      weatherCode: current.weather_code,
      isDay: current.is_day === 1,
    },
    hourly: hourlyPoints,
    daily: dailyPoints,
    meta: {
      source: "open-meteo",
      fetchedAt: fetchedAt.toISOString(),
      modelTime,
      grid: { lat: raw.latitude, lon: raw.longitude, elevationM: raw.elevation },
      attribution: { ...ATTRIBUTION.openMeteo },
    },
  };
}
