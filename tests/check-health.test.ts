import { describe, expect, it } from "vitest";
import { evaluateHealth } from "../scripts/check-health.mjs";

const okPages = { "/": 200, "/sobre": 200, "/el-nino": 200 };
const api = (current: string, forecast: string, servedFrom = "live") => ({
  servedFrom,
  freshness: { current: { status: current }, forecast: { status: forecast } },
});

describe("evaluateHealth", () => {
  it("site saudável: nenhum problema", () => {
    expect(evaluateHealth({ pages: okPages, apiStatus: 200, api: api("fresh", "fresh") })).toEqual({
      problems: [],
      warnings: [],
    });
  });

  it("página fora do ar é problema", () => {
    const { problems } = evaluateHealth({
      pages: { ...okPages, "/sobre": 500 },
      apiStatus: 200,
      api: api("fresh", "fresh"),
    });
    expect(problems).toEqual(["Página /sobre respondeu HTTP 500"]);
  });

  it("API indisponível (503) é problema", () => {
    const { problems } = evaluateHealth({ pages: okPages, apiStatus: 503, api: null });
    expect(problems[0]).toContain("HTTP 503");
  });

  it("previsão velha ou expirada é problema", () => {
    expect(evaluateHealth({ pages: okPages, apiStatus: 200, api: api("expired", "stale") }).problems).toHaveLength(2);
    expect(evaluateHealth({ pages: okPages, apiStatus: 200, api: api("expired", "expired") }).problems).toHaveLength(2);
  });

  it("condições atuais com mais de 30 min ou fallback são só avisos", () => {
    const result = evaluateHealth({ pages: okPages, apiStatus: 200, api: api("stale", "fresh", "fallback") });
    expect(result.problems).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });

  it("formato inesperado da API é problema", () => {
    const { problems } = evaluateHealth({ pages: okPages, apiStatus: 200, api: { foo: 1 } });
    expect(problems[0]).toContain("formato inesperado");
  });
});

describe("evaluateHealth – El Niño (/api/enso)", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const part = (overrides: Record<string, unknown> = {}) => ({
    available: true,
    servedFrom: "live",
    freshness: { status: "fresh" },
    report: { meta: { fetchedAt: "2026-10-20T09:00:00Z" } },
    ...overrides,
  });
  const enso = (overrides: Record<string, unknown> = {}) => ({
    weekly: part(),
    roni: part(),
    discussion: part(),
    ...overrides,
  });
  const check = (ensoStatus: number, body: unknown) =>
    evaluateHealth({ pages: okPages, apiStatus: 200, api: api("fresh", "fresh"), ensoStatus, enso: body, now });

  it("tudo em dia: nenhum problema", () => {
    expect(check(200, enso())).toEqual({ problems: [], warnings: [] });
  });

  it("API do El Niño fora do ar é problema", () => {
    expect(check(503, null).problems[0]).toContain("/api/enso respondeu HTTP 503");
  });

  it("parte indisponível ou expirada é problema", () => {
    const { problems } = check(
      200,
      enso({ roni: { available: false, reason: "unavailable" }, weekly: { available: false, reason: "expired" } }),
    );
    expect(problems).toHaveLength(2);
    expect(problems.join(" ")).toContain("índice RONI");
    expect(problems.join(" ")).toContain("temperatura semanal");
  });

  it("sem busca bem-sucedida há mais de 48 h é problema (formato pode ter mudado)", () => {
    const old = part({ servedFrom: "fallback", report: { meta: { fetchedAt: "2026-10-18T09:00:00Z" } } });
    expect(check(200, enso({ discussion: old })).problems[0]).toContain("boletim mensal");
  });

  it("último dado bom recente ou publicação atrasada são só avisos", () => {
    const result = check(
      200,
      enso({ weekly: part({ servedFrom: "fallback" }), roni: part({ freshness: { status: "stale" } }) }),
    );
    expect(result.problems).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });

  it("sem dados do El Niño na chamada, não avalia (compatível com o uso antigo)", () => {
    expect(evaluateHealth({ pages: okPages, apiStatus: 200, api: api("fresh", "fresh") }).problems).toEqual([]);
  });
});

describe("motivo da falha no monitor", () => {
  it("aviso de fallback diz o motivo vindo da API", () => {
    const body = { ...api("fresh", "fresh", "fallback"), failure: { kind: "http", status: 429, message: "HTTP 429", at: "2026-10-20T19:53:10.000Z" } };
    const { warnings } = evaluateHealth({ pages: okPages, apiStatus: 200, api: body });
    expect(warnings[0]).toBe(
      "Servindo o último dado bom: o Open-Meteo falhou na última tentativa (HTTP 429: limite de uso do provedor, às 19:53 UTC)",
    );
  });

  it("sem motivo na API (versão antiga), o aviso continua como antes", () => {
    const { warnings } = evaluateHealth({ pages: okPages, apiStatus: 200, api: api("fresh", "fresh", "fallback") });
    expect(warnings[0]).toBe("Servindo o último dado bom: o Open-Meteo falhou na última tentativa");
  });

  it("El Niño também mostra o motivo", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const part = {
      available: true,
      servedFrom: "fallback",
      failure: { kind: "timeout", message: "sem resposta em 8000 ms", at: "2026-10-20T11:00:00.000Z" },
      freshness: { status: "fresh" },
      report: { meta: { fetchedAt: "2026-10-20T09:00:00Z" } },
    };
    const ok = { ...part, servedFrom: "live", failure: undefined };
    const { warnings } = evaluateHealth({
      pages: okPages,
      apiStatus: 200,
      api: api("fresh", "fresh"),
      ensoStatus: 200,
      enso: { weekly: part, roni: ok, discussion: ok },
      now,
    });
    expect(warnings[0]).toBe(
      "El Niño – temperatura semanal: servindo o último dado bom (a última busca ao NOAA falhou; sem resposta no tempo limite, às 11:00 UTC)",
    );
  });
});
