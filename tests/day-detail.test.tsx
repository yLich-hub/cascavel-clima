import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DayDetailCard, RAIN_BAR, RAIN_BAR_SELECTED } from "@/components/home/DayDetail";
import { blend, contrastRatio, type RGB } from "@/lib/contrast";
import { dayDetails, hoursByDay, rainAxisMax, type DayDetail } from "@/lib/weather/days";
import { buildWeatherView } from "@/lib/weather/freshness";
import { normalizeOpenMeteo } from "@/lib/weather/normalize";
import { parseOpenMeteoResponse } from "@/lib/providers/open-meteo";
import { CLOUD_TONES, FOG, GLASS, INNER, LOW_SUN_PEAK, SUN_PEAK, VEIL, VEIL_BRIGHT_ALPHA } from "@/lib/weather/scene-palette";
import { sceneFor } from "@/lib/weather/scenes";
import type { DailyPoint, HourlyPoint } from "@/types/weather";
import fixture from "./fixtures/open-meteo-cascavel.json";

const hour = (time: string, mm: number | null, prob: number | null = 50): HourlyPoint => ({
  time,
  temperatureC: 20,
  precipitationProbPct: prob,
  precipitationMm: mm,
  weatherCode: 61,
  isDay: true,
  windSpeedKmh: 5,
});

const day = (date: string, overrides: Partial<DailyPoint> = {}): DailyPoint => ({
  date,
  weatherCode: 61,
  maxC: 25,
  minC: 14,
  precipitationSumMm: 3.2,
  precipitationProbMaxPct: 80,
  sunrise: `${date}T05:59-03:00`,
  sunset: `${date}T18:39-03:00`,
  uvIndexMax: 8,
  ...overrides,
});

describe("hoursByDay", () => {
  it("cada hora pertence ao dia em que o intervalo começa (00:00 = 23h–24h do dia anterior)", () => {
    const days = hoursByDay([
      hour("2026-10-20T23:00-03:00", 0.4),
      hour("2026-10-21T00:00-03:00", 1.2),
      hour("2026-10-21T01:00-03:00", 0),
    ]);
    expect(days.get("2026-10-20")?.map((slot) => slot.startHour)).toEqual([22, 23]);
    expect(days.get("2026-10-21")?.map((slot) => slot.startHour)).toEqual([0]);
    expect(days.get("2026-10-20")?.[1].precipitationMm).toBe(1.2);
  });

  it("dayDetails junta o resumo do dia com as horas dele; dia sem horas fica com lista vazia", () => {
    const details = dayDetails([day("2026-10-20"), day("2026-10-21")], [hour("2026-10-20T16:00-03:00", 2)]);
    expect(details[0]).toMatchObject({ date: "2026-10-20", maxC: 25, hours: [{ startHour: 15, precipitationMm: 2 }] });
    expect(details[1].hours).toEqual([]);
  });
});

describe("rainAxisMax", () => {
  it.each([
    [[0, 0], 1],
    [[0.3, null], 1],
    [[1.6], 2],
    [[4.2], 5],
    [[7], 10],
    [[23.4], 30],
  ])("%j → %i mm", (values, expected) => {
    expect(rainAxisMax(values)).toBe(expected);
  });
});

describe("view: próximas 24 h e horas dos 7 dias", () => {
  it("os cards continuam com 24 h; o detalhe recebe todas as horas futuras", () => {
    const raw = parseOpenMeteoResponse(structuredClone(fixture));
    // Repete a série com o dia seguinte (48 h), como a API faz com os 7 dias.
    const extra = raw.hourly.time.map((time) => time.replace(/^(\d{4}-\d{2}-)(\d{2})/, (_, ym, d) => `${ym}${String(Number(d) + 1).padStart(2, "0")}`));
    for (const key of Object.keys(raw.hourly) as Array<keyof typeof raw.hourly>) {
      const series = raw.hourly[key] as unknown[];
      (raw.hourly[key] as unknown[]) = key === "time" ? [...series, ...extra] : [...series, ...series];
    }
    const report = normalizeOpenMeteo(raw, new Date(Date.parse(`${raw.hourly.time[0]}:00-03:00`)));
    const view = buildWeatherView({ report, servedFrom: "live" }, new Date(Date.parse(`${raw.hourly.time[0]}:30-03:00`)));
    expect(view.hourly).toHaveLength(24);
    expect(view.hourlyAhead.length).toBeGreaterThan(24);
    expect(view.hourlyAhead.slice(0, 24)).toEqual(view.hourly);
  });
});

const sample: DayDetail[] = [
  {
    date: "2026-10-20",
    minC: 14,
    maxC: 25,
    precipitationSumMm: 3.2,
    precipitationProbMaxPct: 80,
    hours: [
      { time: "2026-10-20T16:00-03:00", startHour: 15, precipitationMm: 0, precipitationProbPct: 20, temperatureC: 24, weatherCode: 3 },
      { time: "2026-10-20T17:00-03:00", startHour: 16, precipitationMm: 2.4, precipitationProbPct: 80, temperatureC: 22, weatherCode: 63 },
    ],
  },
  { date: "2026-10-21", minC: 15, maxC: 27, precipitationSumMm: 0, precipitationProbMaxPct: 5, hours: [
    { time: "2026-10-21T13:00-03:00", startHour: 12, precipitationMm: 0, precipitationProbPct: 5, temperatureC: 27, weatherCode: 1 },
  ] },
  { date: "2026-10-22", minC: null, maxC: null, precipitationSumMm: null, precipitationProbMaxPct: null, hours: [] },
];

describe("DayDetailCard", () => {
  const html = renderToStaticMarkup(<DayDetailCard days={sample} today="2026-10-20" />);

  it("uma aba por dia, com o primeiro selecionado e rótulos Hoje/Amanhã", () => {
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toContain("Hoje");
    expect(html).toContain("Amanhã");
  });

  it("abre na hora mais chuvosa e mostra chance e temperatura junto", () => {
    expect(html).toContain("2,4 mm</strong> das 16h–17h");
    expect(html).toContain("chance 80%");
  });

  it("explica que hoje só mostra horas futuras e qual hora cada barra representa", () => {
    expect(html).toContain("só as horas que ainda não passaram");
    expect(html).toContain("das 15h às 16h");
  });

  it("tabela com todas as horas (o gráfico nunca é o único acesso)", () => {
    expect(html.match(/<tr class="border-t/g)).toHaveLength(2);
  });

  it("dia seco e dia sem horas têm mensagens próprias", () => {
    const dry = renderToStaticMarkup(<DayDetailCard days={[sample[1]]} today="2026-10-20" />);
    expect(dry).toContain("Nenhuma hora com chuva prevista");
    const empty = renderToStaticMarkup(<DayDetailCard days={[sample[2]]} today="2026-10-20" />);
    expect(empty).toContain("Previsão hora a hora indisponível para este dia.");
  });

  it("não usa linguagem de alerta", () => {
    expect(html).not.toMatch(/alerta|perigo|cuidado|alagamento/i);
  });
});

describe("cor das barras de chuva", () => {
  const hex = (v: string): RGB => [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16)) as unknown as RGB;
  const weakest = Math.min(...VEIL.map((v) => v.alpha));
  const backgrounds: RGB[] = [];
  for (const twilight of [null, "dawn", "dusk"] as const) {
    for (const isDay of [true, false]) {
      for (const code of [null, 0, 1, 2, 3, 45, 61, 73, 95]) {
        const scene = sceneFor(code, isDay, twilight);
        const points: RGB[] = scene.sky.map(hex);
        if (scene.sun) points.push(SUN_PEAK);
        if (scene.lowSun) points.push(LOW_SUN_PEAK);
        if (scene.clouds.count > 0) points.push(CLOUD_TONES[scene.clouds.tone].light);
        if (scene.fog) points.push(blend(FOG.color, FOG.alpha, points[1]));
        if (scene.snow > 0) points.push([255, 255, 255]);
        for (const point of points) {
          let color = blend([0, 0, 0], weakest, point);
          if (scene.bright) color = blend([0, 0, 0], VEIL_BRIGHT_ALPHA, color);
          backgrounds.push(blend(INNER.color, INNER.alpha, blend(GLASS.color, GLASS.alpha, color)));
        }
      }
    }
  }

  it.each([RAIN_BAR, RAIN_BAR_SELECTED])("%s tem contraste ≥ 3:1 (WCAG 1.4.11) no balão, em qualquer cena", (color) => {
    for (const background of backgrounds) expect(contrastRatio(hex(color), background)).toBeGreaterThanOrEqual(3);
  });
});
