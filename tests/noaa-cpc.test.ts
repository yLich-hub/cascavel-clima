import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ProviderError } from "@/lib/providers/http";
import {
  CPC_URLS,
  KEEP_SEASONS,
  KEEP_WEEKS,
  fetchDiscussion,
  fetchRoni,
  fetchWeeklyNino,
  parseDiscussion,
  parseRoni,
  parseWeeklyNino,
} from "@/lib/providers/noaa-cpc";

// Cópias reais dos arquivos do NOAA CPC, baixadas em 20/10/2026.
const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const WEEKLY = fixture("cpc-weekly-nino.txt");
const RONI = fixture("cpc-roni.txt");
const DISCUSSION = fixture("cpc-ensodisc.html");

const invalidError = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe("invalid-response");
    return (error as ProviderError).message;
  }
  throw new Error("deveria ter falhado");
};

const WEEKLY_HEADER = `                Nino1+2      Nino3        Nino34        Nino4
 Week          SST SSTA     SST SSTA     SST SSTA     SST SSTA`;

describe("parseWeeklyNino (arquivo real)", () => {
  const weeks = parseWeeklyNino(WEEKLY);

  it("lê a semana mais recente com as 4 regiões", () => {
    expect(weeks.at(-1)).toEqual({
      weekCenter: "2026-10-14",
      regions: {
        nino12: { sstC: 26.2, anomalyC: 5.2 },
        nino3: { sstC: 29.2, anomalyC: 4.2 },
        nino34: { sstC: 30, anomalyC: 3.3 },
        nino4: { sstC: 29.7, anomalyC: 1.1 },
      },
    });
  });

  it("lê anomalias negativas coladas na temperatura (\"20.9-0.8\")", () => {
    expect(weeks.find((w) => w.weekCenter === "2025-11-12")?.regions.nino12).toEqual({ sstC: 20.9, anomalyC: -0.8 });
  });

  it("guarda só as últimas semanas, em ordem", () => {
    expect(weeks).toHaveLength(KEEP_WEEKS);
    for (let i = 1; i < weeks.length; i++) expect(weeks[i].weekCenter > weeks[i - 1].weekCenter).toBe(true);
  });

  it.each([
    ["sem cabeçalho", " 14OCT2026     26.2 5.2     29.2 4.2     30.0 3.3     29.7 1.1"],
    ["linha incompleta", `${WEEKLY_HEADER}\n 14OCT2026     26.2 5.2     29.2 4.2     30.0`],
    ["anomalia absurda", `${WEEKLY_HEADER}\n 14OCT2026     26.2 9.9     29.2 4.2     30.0 3.3     29.7 1.1`],
    ["mês desconhecido", `${WEEKLY_HEADER}\n 14XYZ2026     26.2 5.2     29.2 4.2     30.0 3.3     29.7 1.1`],
    ["data inexistente", `${WEEKLY_HEADER}\n 31FEB2026     26.2 5.2     29.2 4.2     30.0 3.3     29.7 1.1`],
    [
      "semanas fora de ordem",
      `${WEEKLY_HEADER}\n 14OCT2026     26.2 5.2     29.2 4.2     30.0 3.3     29.7 1.1\n 07OCT2026     26.1 5.2     29.0 4.1     30.0 3.3     29.9 1.3`,
    ],
    ["arquivo vazio", WEEKLY_HEADER],
  ])("recusa formato inesperado: %s", (_name, text) => {
    invalidError(() => parseWeeklyNino(text));
  });
});

describe("parseRoni (arquivo real)", () => {
  const points = parseRoni(RONI);

  it("lê o trimestre mais recente", () => {
    expect(points.at(-1)).toEqual({ season: "JAS", year: 2026, centerMonth: "2026-08", anomalyC: 1.69 });
  });

  it("guarda só os últimos trimestres, em sequência", () => {
    expect(points).toHaveLength(KEEP_SEASONS);
    expect(points.at(-2)).toMatchObject({ season: "JJA", year: 2026, anomalyC: 1.36 });
  });

  it("virada de ano: NDJ do ano Y é seguido por DJF do ano Y+1; mês central de DJF é janeiro", () => {
    const text = "SEAS   YR  ANOM\nOND  2025 -0.50\nNDJ  2025 -0.40\nDJF  2026 -0.30\n";
    expect(parseRoni(text).map((p) => p.centerMonth)).toEqual(["2025-11", "2025-12", "2026-01"]);
  });

  it.each([
    ["sem cabeçalho", "JAS  2026  1.69"],
    ["trimestre pulado", "SEAS   YR  ANOM\nJJA  2026  1.36\nASO  2026  1.80"],
    ["trimestre repetido", "SEAS   YR  ANOM\nJJA  2026  1.36\nJJA  2026  1.36"],
    ["ano errado na virada", "SEAS   YR  ANOM\nNDJ  2025 -0.40\nDJF  2025 -0.30"],
    ["valor absurdo", "SEAS   YR  ANOM\nJAS  2026  9.99"],
    ["trimestre desconhecido", "SEAS   YR  ANOM\nXYZ  2026  1.00"],
  ])("recusa formato inesperado: %s", (_name, text) => {
    invalidError(() => parseRoni(text));
  });
});

describe("parseDiscussion (página real)", () => {
  it("lê a data de emissão e a situação do sistema de alerta", () => {
    expect(parseDiscussion(DISCUSSION)).toEqual({ issuedOn: "2026-10-08", statuses: ["el-nino-advisory"] });
  });

  const page = (status: string, date = "8 October 2026") =>
    `<p>DIAGNOSTIC DISCUSSION</p><p>issued by</p><p>CLIMATE PREDICTION CENTER/NCEP/NWS</p><p>${date}</p>` +
    `<p>ENSO Alert System Status: </p><p>${status}</p><p>Synopsis:&nbsp;texto</p>`;

  it.each([
    ["Not Active", ["not-active"]],
    ["La Ni&ntilde;a Watch", ["la-nina-watch"]],
    ["El Ni&ntilde;o Watch", ["el-nino-watch"]],
    ["Final El Ni&ntilde;o Advisory / La Ni&ntilde;a Watch", ["final-el-nino-advisory", "la-nina-watch"]],
    ["Final La Niña Advisory", ["final-la-nina-advisory"]],
  ])("reconhece a situação \"%s\"", (status, expected) => {
    expect(parseDiscussion(page(status)).statuses).toEqual(expected);
  });

  it("recusa situação desconhecida (não adivinha)", () => {
    expect(invalidError(() => parseDiscussion(page("El Ni&ntilde;o Emergency")))).toContain("desconhecida");
  });

  it("recusa página sem data ou sem situação", () => {
    invalidError(() => parseDiscussion("<p>ENSO Alert System Status: Not Active Synopsis: x</p>"));
    invalidError(() => parseDiscussion(page("Not Active").replace(/ENSO Alert System Status:/, "Outro:")));
    invalidError(() => parseDiscussion(page("Not Active", "31 February 2026")));
  });
});

describe("chamadas ao NOAA", () => {
  const text = (body: string, status = 200) => async () => new Response(body, { status });

  it("buscam a URL certa e devolvem os dados lidos", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      return new Response(url === CPC_URLS.weekly ? WEEKLY : url === CPC_URLS.roni ? RONI : DISCUSSION);
    }) as typeof fetch;
    expect((await fetchWeeklyNino({ fetchImpl })).at(-1)?.weekCenter).toBe("2026-10-14");
    expect((await fetchRoni({ fetchImpl })).at(-1)?.season).toBe("JAS");
    expect((await fetchDiscussion({ fetchImpl })).issuedOn).toBe("2026-10-08");
    expect(urls).toEqual([CPC_URLS.weekly, CPC_URLS.roni, CPC_URLS.discussion]);
  });

  it("HTTP 503 vira erro que vale repetir; página de erro em HTML vira resposta inválida", async () => {
    const http = await fetchRoni({ fetchImpl: text("fora do ar", 503) as typeof fetch }).catch((e) => e);
    expect(http).toMatchObject({ kind: "http", status: 503, retryable: true });
    const html = await fetchRoni({ fetchImpl: text("<html>manutenção</html>") as typeof fetch }).catch((e) => e);
    expect(html).toMatchObject({ kind: "invalid-response", retryable: false });
  });

  it("todas as URLs usam HTTPS", () => {
    for (const url of Object.values(CPC_URLS)) expect(url.startsWith("https://")).toBe(true);
  });
});
