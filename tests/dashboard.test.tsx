import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeatherUnavailable } from "@/components/weather/StatusMessages";
import { WeatherDashboard } from "@/components/weather/WeatherDashboard";
import { parseOpenMeteoResponse } from "@/lib/providers/open-meteo";
import { buildWeatherView, localDate } from "@/lib/weather/freshness";
import { normalizeOpenMeteo } from "@/lib/weather/normalize";
import type { ServedFrom } from "@/types/weather";
import fixture from "./fixtures/open-meteo-cascavel.json";

// Fixture: 15:15 local, 19,5 °C, código 3 (Nublado). Buscado às 18:20 UTC (15:20 local).
const FETCHED_AT = new Date("2026-10-14T18:20:00Z");

function render(minutesAfterFetch: number, servedFrom: ServedFrom = "live", mutate?: (raw: ReturnType<typeof parseOpenMeteoResponse>) => void) {
  const raw = parseOpenMeteoResponse(structuredClone(fixture));
  mutate?.(raw);
  const report = normalizeOpenMeteo(raw, FETCHED_AT);
  const now = new Date(FETCHED_AT.getTime() + minutesAfterFetch * 60_000);
  const view = buildWeatherView({ report, servedFrom }, now);
  return renderToStaticMarkup(<WeatherDashboard view={view} today={localDate(now)} />);
}

describe("WeatherDashboard", () => {
  it("dado fresco: mostra condições, rótulos e atribuição, sem aviso", () => {
    const html = render(0);
    expect(html).toContain("20°");
    expect(html).toContain("Nublado");
    expect(html).toContain("estimativa de modelo, não medição");
    expect(html).toContain("Condições das 15:15");
    expect(html).toContain('data-status="fresh"');
    expect(html).toContain("Hoje");
    expect(html).toContain('href="https://open-meteo.com/"');
    expect(html).toContain('href="https://open-meteo.com/en/licence"');
    expect(html).not.toContain("Não conseguimos atualizar");
    expect(html).not.toContain("indisponív");
  });

  it("dado velho: marca o aviso de desatualização", () => {
    const html = render(60);
    expect(html).toContain('data-status="stale"');
    expect(html).toContain("podem estar desatualizados");
  });

  it("fallback: avisa que não foi possível atualizar e mostra o horário da busca", () => {
    const html = render(5, "fallback");
    expect(html).toContain("Não conseguimos atualizar a previsão agora");
    expect(html).toContain("15:20");
  });

  it("condições atuais expiradas: não exibe nenhum valor atual", () => {
    const html = render(240);
    expect(html).toContain("As condições atuais não estão disponíveis");
    expect(html).not.toContain("Sensação térmica");
    expect(html).not.toContain("Umidade");
    // previsão ainda vale e continua aparecendo
    expect(html).toContain("Próximas horas");
    expect(html).not.toContain("Previsão por hora indisponível");
  });

  it("previsão expirada: não exibe nenhuma temperatura", () => {
    const html = render(25 * 60);
    expect(html).toContain("Previsão por hora indisponível");
    expect(html).toContain("Previsão diária indisponível");
    expect(html).not.toMatch(/-?\d+°/);
  });

  it("dado ausente aparece como —, não como 0", () => {
    const html = render(0, "live", (raw) => {
      raw.hourly.precipitation_probability.fill(null);
    });
    expect(html).toContain("—");
    expect(html).not.toMatch(/chance de chuva<\/span>0%/);
  });
});

describe("WeatherUnavailable", () => {
  it("não mostra valores e aponta fontes oficiais", () => {
    const html = renderToStaticMarkup(<WeatherUnavailable />);
    expect(html).toContain("Previsão indisponível no momento");
    // os links oficiais ficam no AlertsBox, sempre visível na página
    expect(html).toContain('href="#alertas-oficiais"');
    expect(html).not.toMatch(/\d+°/);
  });
});
