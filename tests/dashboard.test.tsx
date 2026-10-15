import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { WeatherUnavailable } from "@/components/weather/StatusMessages";
import { parseOpenMeteoResponse } from "@/lib/providers/open-meteo";
import { buildWeatherView } from "@/lib/weather/freshness";
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
  return renderToStaticMarkup(<HomeDashboard view={view} now={now} />);
}

describe("HomeDashboard (estados)", () => {
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

describe("acessibilidade da lista de horas", () => {
  it("a região rolável recebe foco pelo teclado e tem nome acessível", () => {
    const html = render(0);
    expect(html).toMatch(/<div role="region" aria-labelledby="proximas-horas" tabindex="0"/);
  });
});

describe("HomeDashboard (widgets do novo visual)", () => {
  const html = render(0); // 15:20 em Cascavel; fixture: nascer 06:00, pôr 18:39, UV 3,25

  it("resumo em texto feito só com dados", () => {
    expect(html).toContain("Sensação térmica de");
    expect(html).toMatch(/Chance de chuva de até \d+% nas próximas 23 horas\./);
  });

  it("vento: faixa e horário do pico das próximas horas", () => {
    expect(html).toMatch(/Próximas 23 h: de \d+ km\/h a \d+ km\/h, pico às \d{2}h\./);
  });

  it("sol: horários do dia e próximo evento", () => {
    expect(html).toContain("06:00");
    expect(html).toContain("18:39");
    expect(html).toContain("Pôr do sol às 18:39.");
  });

  it("UV: valor arredondado e faixa da OMS", () => {
    expect(html).toContain("Índice UV máximo hoje");
    expect(html).toContain("UV máx. hoje: 3 (moderado)");
  });

  it("curva dos 7 dias com lista em texto para leitores de tela", () => {
    expect(html).toContain("quarta-feira, 14/10:");
    expect(html).toMatch(/mínima \d+°,\s*máxima \d+°/);
  });

  it("todo texto da Início fica dentro de cards de vidro (contraste testado)", () => {
    // Nenhum texto em cinza escuro do visual antigo, que sumiria sobre a cena.
    expect(html).not.toMatch(/text-zinc-[5-9]00/);
  });

  it("sem dado do dia: widgets mostram indisponível em vez de inventar", () => {
    const expired = render(25 * 60);
    expect(expired).toContain("Previsão de vento indisponível");
    expect(expired).toContain("Horários do sol indisponíveis");
    expect(expired).toContain("Índice UV indisponível");
  });
});
