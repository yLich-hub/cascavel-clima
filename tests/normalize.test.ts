import { describe, expect, it } from "vitest";
import { parseOpenMeteoResponse } from "@/lib/providers/open-meteo";
import { normalizeOpenMeteo, withOffset } from "@/lib/weather/normalize";
import fixture from "./fixtures/open-meteo-cascavel.json";

const FETCHED_AT = new Date("2026-10-14T18:20:00Z");
const parsed = () => parseOpenMeteoResponse(structuredClone(fixture));

describe("withOffset", () => {
  it("formata offsets negativos, zero e com minutos", () => {
    expect(withOffset("2026-10-14T15:00", -10800)).toBe("2026-10-14T15:00-03:00");
    expect(withOffset("2026-10-14T15:00", 0)).toBe("2026-10-14T15:00+00:00");
    expect(withOffset("2026-10-14T15:00", 19800)).toBe("2026-10-14T15:00+05:30");
  });

  it("gera horário que o JavaScript interpreta no instante certo, inclusive perto da meia-noite", () => {
    // 23:30 em Cascavel = 02:30 UTC do dia seguinte.
    const iso = withOffset("2026-10-14T23:30", -10800);
    expect(new Date(iso).toISOString()).toBe("2026-10-15T02:30:00.000Z");
  });
});

describe("normalizeOpenMeteo", () => {
  const report = normalizeOpenMeteo(parsed(), FETCHED_AT);

  it("mantém a cidade configurada, não a célula do modelo", () => {
    expect(report.location).toMatchObject({ name: "Cascavel", state: "PR", lat: -24.95583 });
    expect(report.meta.grid).toEqual({
      lat: fixture.latitude,
      lon: fixture.longitude,
      elevationM: fixture.elevation,
    });
  });

  it("copia as condições atuais sem alterar valores", () => {
    expect(report.current).toEqual({
      time: `${fixture.current.time}-03:00`,
      temperatureC: fixture.current.temperature_2m,
      apparentTemperatureC: fixture.current.apparent_temperature,
      humidityPct: fixture.current.relative_humidity_2m,
      precipitationMm: fixture.current.precipitation,
      windSpeedKmh: fixture.current.wind_speed_10m,
      windDirectionDeg: fixture.current.wind_direction_10m,
      weatherCode: fixture.current.weather_code,
      isDay: fixture.current.is_day === 1,
    });
  });

  it("gera 24 pontos horários e 7 diários com offset explícito", () => {
    expect(report.hourly).toHaveLength(24);
    expect(report.daily).toHaveLength(7);
    for (const point of report.hourly) expect(point.time).toMatch(/-03:00$/);
    expect(report.daily[0].date).toBe(fixture.daily.time[0]);
    expect(report.hourly[0].temperatureC).toBe(fixture.hourly.temperature_2m[0]);
    expect(report.daily[0].maxC).toBe(fixture.daily.temperature_2m_max[0]);
    expect(report.daily[0].minC).toBe(fixture.daily.temperature_2m_min[0]);
  });

  it("registra quando buscamos o dado e a atribuição exigida pela licença", () => {
    expect(report.meta.fetchedAt).toBe("2026-10-14T18:20:00.000Z");
    expect(report.meta.modelTime).toBe(report.current.time);
    expect(report.meta.attribution.url).toBe("https://open-meteo.com/");
    expect(report.meta.attribution.license).toBe("CC BY 4.0");
  });

  it("preserva ausência de dado como null, nunca como 0", () => {
    const raw = parsed();
    raw.hourly.precipitation_probability[3] = null;
    raw.hourly.is_day[3] = null;
    raw.daily.precipitation_sum[2] = null;
    const result = normalizeOpenMeteo(raw, FETCHED_AT);
    expect(result.hourly[3].precipitationProbPct).toBeNull();
    expect(result.hourly[3].isDay).toBeNull();
    expect(result.daily[2].precipitationSumMm).toBeNull();
  });
});
