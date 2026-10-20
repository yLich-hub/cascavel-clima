import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnsoLivePanel } from "@/components/enso/EnsoLivePanel";
import { OceanWarm } from "@/components/scene/OceanScene";
import { blend, contrastRatio, type RGB } from "@/lib/contrast";
import { buildEnsoView } from "@/lib/enso/view";
import {
  DIVERGING,
  STATUS_TEXT,
  anomalyTone,
  formatAnomaly,
  formatSeason,
  oceanWarmth,
} from "@/lib/enso/present";
import { CPC_URLS } from "@/lib/enso/urls";
import { parseDiscussion, parseRoni, parseWeeklyNino } from "@/lib/providers/noaa-cpc";
import type { Loaded } from "@/lib/sources/resilient-source";
import { GLASS, INNER, OCEAN, VEIL } from "@/lib/weather/scene-palette";
import type { DiscussionReport, EnsoAlertStatus, EnsoView, RoniReport, WeeklyNinoReport } from "@/types/enso";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const meta = { fetchedAt: "2026-10-20T04:07:00.000Z", sourceUrl: "https://www.cpc.ncep.noaa.gov/" };
const weekly: WeeklyNinoReport = { weeks: parseWeeklyNino(fixture("cpc-weekly-nino.txt")), meta };
const roni: RoniReport = { points: parseRoni(fixture("cpc-roni.txt")), meta };
const discussion: DiscussionReport = { discussion: parseDiscussion(fixture("cpc-ensodisc.html")), meta };

const ok = <T,>(report: T, servedFrom: "live" | "fallback" = "live"): PromiseSettledResult<Loaded<T>> => ({
  status: "fulfilled",
  value: { report, servedFrom },
});
const failed: PromiseRejectedResult = { status: "rejected", reason: new Error("fora do ar") };
const NOW = new Date("2026-10-20T12:00:00Z");
const live = buildEnsoView({ weekly: ok(weekly), roni: ok(roni), discussion: ok(discussion) }, NOW);
const render = (view: EnsoView) => renderToStaticMarkup(<EnsoLivePanel view={view} />);

describe("formatação", () => {
  it.each([
    [3.3, 1, "+3,3 °C"],
    [-0.8, 1, "−0,8 °C"],
    [-0.04, 1, "0,0 °C"],
    [1.69, 2, "+1,69 °C"],
    [0, 2, "0,00 °C"],
  ])("formatAnomaly(%f, %i) = %s", (value, digits, expected) => {
    expect(formatAnomaly(value, digits)).toBe(expected);
  });

  it("trimestres por extenso, inclusive na virada do ano", () => {
    expect(formatSeason({ centerMonth: "2026-08" })).toBe("jul–set/2026");
    expect(formatSeason({ centerMonth: "2026-01" })).toBe("dez/2025–fev/2026");
    expect(formatSeason({ centerMonth: "2026-12" })).toBe("nov/2026–jan/2027");
  });

  it("cor pelo limite de ±0,5 °C do NOAA", () => {
    expect([0.5, 0.49, 0, -0.49, -0.5].map(anomalyTone)).toEqual(["warm", "neutral", "neutral", "neutral", "cool"]);
  });

  it("toda situação do sistema de alerta tem texto em português e o nome oficial", () => {
    const all: EnsoAlertStatus[] = [
      "not-active", "el-nino-watch", "el-nino-advisory", "final-el-nino-advisory",
      "la-nina-watch", "la-nina-advisory", "final-la-nina-advisory",
    ];
    for (const id of all) {
      expect(STATUS_TEXT[id].label.length).toBeGreaterThan(3);
      expect(STATUS_TEXT[id].official).toMatch(/Watch|Advisory|Not Active/);
    }
  });
});

describe("painel ao vivo com os dados reais de 20/10/2026", () => {
  const html = render(live);

  it("mostra a situação oficial, com o nome em inglês e a data do boletim", () => {
    expect(html).toContain("El Niño em curso");
    expect(html).toContain("“El Niño Advisory”");
    expect(html).toContain("Boletim de 08/10/2026");
  });

  it("mostra os números como publicados, com a data de cada um", () => {
    expect(html).toContain("+3,3 °C");
    expect(html).toContain("semana de 14/10/2026");
    expect(html).toContain("+1,69 °C");
    expect(html).toContain("jul–set/2026");
    for (const value of ["+1,1 °C", "+4,2 °C", "+5,2 °C"]) expect(html).toContain(value);
  });

  it("tem a tabela com todos os valores (gráfico nunca é o único acesso)", () => {
    expect(html.match(/<table/g)).toHaveLength(2);
    expect(html.match(/<tr class="border-t/g)).toHaveLength(weekly.weeks.length + roni.points.length);
  });

  it("cita o NOAA com links seguros e diz quando consultou", () => {
    for (const url of Object.values(CPC_URLS)) expect(html).toContain(`href="${url}"`);
    for (const tag of html.match(/<a [^>]*>/g) ?? []) expect(tag).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Consultado em 20/10/2026 às 01:07");
  });

  it("não usa linguagem de alerta nem atribui eventos ao El Niño", () => {
    expect(html).not.toMatch(/perigo|cuidado|alagamento|causad[oa] pel[oa]/i);
  });
});

describe("painel ao vivo quando algo falha", () => {
  it("parte indisponível vira aviso com link para a fonte, sem número", () => {
    const view = buildEnsoView({ weekly: failed, roni: failed, discussion: failed }, NOW);
    const html = render(view);
    expect(html).toContain("Não foi possível obter a situação oficial agora");
    expect(html.match(/Dado indisponível no momento/g)).toHaveLength(2);
    expect(html).not.toMatch(/[+−]\d,\d °C/);
  });

  it("último dado bom é identificado como tal", () => {
    const view = buildEnsoView({ weekly: ok(weekly), roni: ok(roni, "fallback"), discussion: ok(discussion) }, NOW);
    expect(render(view)).toContain("A consulta mais recente falhou; este é o último dado obtido.");
  });

  it("boletim atrasado avisa para conferir a fonte", () => {
    const late = buildEnsoView({ weekly: failed, roni: failed, discussion: ok(discussion) }, new Date("2026-11-20T12:00:00Z"));
    expect(render(late)).toContain("já deveria ter saído");
  });
});

describe("cores dos gráficos sobre o fundo da página", () => {
  const hex = (value: string): RGB => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as unknown as RGB;
  const weakestVeil = Math.min(...VEIL.map((v) => v.alpha));
  const brightest = blend(OCEAN.hot.color, OCEAN.hot.alpha, blend(OCEAN.warm.color, OCEAN.warm.alpha, OCEAN.waves[0]));
  const backgrounds = [hex(OCEAN.sky[0]), ...OCEAN.waves, brightest].map((point) => {
    const card = blend(GLASS.color, GLASS.alpha, blend([0, 0, 0], weakestVeil, point));
    return blend(INNER.color, INNER.alpha, card);
  });

  it.each(Object.entries(DIVERGING))("marca %s tem contraste ≥ 3:1 (WCAG 1.4.11) em qualquer ponto", (_name, color) => {
    for (const background of backgrounds) {
      expect(contrastRatio(hex(color), background)).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("mancha quente ligada ao dado semanal", () => {
  it("proporcional ao Niño 3.4 até +3 °C; some sem dado ou abaixo de zero", () => {
    expect(oceanWarmth(null)).toBe(0);
    expect(oceanWarmth(-1)).toBe(0);
    expect(oceanWarmth(1.5)).toBe(0.5);
    expect(oceanWarmth(3.3)).toBe(1);
  });

  it("nunca fica maior nem mais opaca que a ilustração testada no contraste", () => {
    const html = renderToStaticMarkup(<OceanWarm warmth={1} />);
    expect(html).toContain("transform:scale(1)");
    expect(html).toContain("opacity:1");
    expect(renderToStaticMarkup(<OceanWarm warmth={0} />)).toContain("opacity:0");
  });
});
