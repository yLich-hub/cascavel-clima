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
