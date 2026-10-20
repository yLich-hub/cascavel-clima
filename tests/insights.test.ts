import { describe, expect, it } from "vitest";
import { scaleY, smoothPath } from "@/lib/svg";
import { describeNow, sunProgress, twilightAt, uvCategory, windRange } from "@/lib/weather/insights";
import type { CurrentConditions, HourlyPoint } from "@/types/weather";

describe("uvCategory (faixas da OMS)", () => {
  it.each([
    [0, 0, "baixo"],
    [2.4, 2, "baixo"],
    [2.95, 3, "moderado"],
    [5.4, 5, "moderado"],
    [6, 6, "alto"],
    [7.49, 7, "alto"],
    [8.55, 9, "muito alto"],
    [10.4, 10, "muito alto"],
    [11, 11, "extremo"],
    [14.2, 14, "extremo"],
  ])("%f → %i (%s)", (index, value, level) => {
    expect(uvCategory(index)).toEqual({ value, level });
  });

  it("sem dado não classifica", () => {
    expect(uvCategory(null)).toBeNull();
  });
});

describe("sunProgress", () => {
  const rise = "2026-10-15T05:59-03:00";
  const set = "2026-10-15T18:39-03:00";
  const at = (local: string) => new Date(`2026-10-15T${local}-03:00`);

  it("antes do nascer, durante o dia e depois do pôr", () => {
    expect(sunProgress(at("05:00"), rise, set)).toEqual({ state: "before", fraction: 0 });
    expect(sunProgress(at("20:00"), rise, set)).toEqual({ state: "after", fraction: 1 });
    const noon = sunProgress(at("12:19"), rise, set);
    expect(noon?.state).toBe("day");
    expect(noon && noon.fraction).toBeCloseTo(0.5, 2);
  });

  it("sem horários ou horários incoerentes não calcula", () => {
    expect(sunProgress(at("12:00"), null, set)).toBeNull();
    expect(sunProgress(at("12:00"), set, rise)).toBeNull();
  });
});

const current: CurrentConditions = {
  time: "2026-10-15T10:00-03:00",
  temperatureC: 21.4,
  apparentTemperatureC: 23.2,
  humidityPct: 80,
  precipitationMm: 0.1,
  windSpeedKmh: 9.2,
  windDirectionDeg: 350,
  weatherCode: 51,
  isDay: true,
};

const hour = (time: string, prob: number | null, wind: number | null): HourlyPoint => ({
  time,
  temperatureC: 20,
  precipitationProbPct: prob,
  precipitationMm: 0,
  weatherCode: 3,
  isDay: true,
  windSpeedKmh: wind,
});

describe("describeNow", () => {
  it("monta a frase só com dados", () => {
    const text = describeNow(current, [hour("t1", 40, 5), hour("t2", 96, 7), hour("t3", null, 6)]);
    expect(text).toBe(
      "Sensação térmica de 23°, umidade de 80% e vento de N a 9 km/h. Chance de chuva de até 96% nas próximas 3 horas.",
    );
  });

  it("sem probabilidades, não fala de chuva (nunca inventa 0%)", () => {
    expect(describeNow(current, [hour("t1", null, 5)])).not.toContain("Chance de chuva");
  });

  it("não usa linguagem de alerta", () => {
    expect(describeNow(current, [hour("t1", 100, 80)])).not.toMatch(/alerta|perigo|risco|cuidado|alagamento/i);
  });
});

describe("windRange", () => {
  it("encontra mínimo, máximo e o horário do máximo, ignorando horas sem dado", () => {
    expect(windRange([hour("10h", 0, 7), hour("11h", 0, null), hour("12h", 0, 13.3), hour("13h", 0, 9)])).toEqual({
      min: 7,
      max: 13.3,
      maxAt: "12h",
    });
  });

  it("sem dados de vento, retorna null", () => {
    expect(windRange([hour("10h", 0, null)])).toBeNull();
  });
});

describe("smoothPath e scaleY", () => {
  it("passa por todos os pontos", () => {
    const d = smoothPath([
      { x: 0, y: 10 },
      { x: 50, y: 0 },
      { x: 100, y: 20 },
    ]);
    expect(d.startsWith("M0,10")).toBe(true);
    expect(d).toContain(" 50,0");
    expect(d.endsWith(" 100,20")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });

  it("casos degenerados", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 3, y: 4 }])).toBe("M3,4");
  });

  it("maior valor fica mais alto na tela; faixa plana fica no meio", () => {
    expect(scaleY(30, 10, 30, 0, 100)).toBe(0);
    expect(scaleY(10, 10, 30, 0, 100)).toBe(100);
    expect(scaleY(20, 20, 20, 0, 100)).toBe(50);
  });
});

describe("twilightAt", () => {
  const rise = "2026-10-15T05:59-03:00";
  const set = "2026-10-15T18:39-03:00";
  const at = (local: string) => new Date(`2026-10-15T${local}-03:00`);

  it("até 40 min antes ou depois do nascer: amanhecer; do pôr: entardecer", () => {
    expect(twilightAt(at("05:19"), rise, set)).toBe("dawn");
    expect(twilightAt(at("06:39"), rise, set)).toBe("dawn");
    expect(twilightAt(at("17:59"), rise, set)).toBe("dusk");
    expect(twilightAt(at("19:19"), rise, set)).toBe("dusk");
  });

  it("fora das janelas ou sem horários: nada", () => {
    expect(twilightAt(at("05:18"), rise, set)).toBeNull();
    expect(twilightAt(at("12:00"), rise, set)).toBeNull();
    expect(twilightAt(at("19:20"), rise, set)).toBeNull();
    expect(twilightAt(at("06:00"), null, set)).toBeNull();
    expect(twilightAt(at("06:00"), "inválido", set)).toBeNull();
  });
});
