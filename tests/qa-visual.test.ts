import { describe, expect, it } from "vitest";
import { MIN_TOUCH_PX, PAGES, VIEWPORTS, evaluateQa } from "../scripts/qa-visual.mjs";

const run = (overrides: Record<string, unknown> = {}) => ({
  path: "/",
  viewport: "mobile",
  reducedMotion: false,
  h1: 1,
  lang: "pt-BR",
  fontLoaded: true,
  overflow: [],
  smallTargets: [],
  story: null,
  screenshots: 5,
  errors: [],
  ...overrides,
});
const resize = (overrides: Record<string, unknown> = {}) => ({
  path: "/",
  mainFresh: 1152,
  mainAfterResize: 1152,
  overflowAfterResize: 0,
  ...overrides,
});
const evaluate = (runs: unknown[], resizes: unknown[] = [resize()]) => evaluateQa({ runs, resize: resizes });

describe("evaluateQa", () => {
  it("tudo certo: nenhum problema", () => {
    expect(evaluate([run()])).toEqual({ problems: [], warnings: [] });
  });

  it("erros de console/rede, rolagem lateral, h1, idioma e fonte são problemas", () => {
    const { problems } = evaluate([
      run({
        errors: ["console: falhou"],
        overflow: [{ y: 0, scrollWidth: 420 }],
        h1: 0,
        lang: "en",
        fontLoaded: false,
      }),
    ]);
    expect(problems).toHaveLength(5);
    expect(problems.join(" ")).toContain("rolagem lateral em y=0 (420px)");
  });

  it("alvo de toque pequeno no celular é problema", () => {
    const { problems } = evaluate([run({ smallTargets: [{ height: 32, label: "Hoje" }] })]);
    expect(problems[0]).toContain("alvo de toque pequeno (32px): Hoje");
  });

  it("história: passos fora de ordem ou manifesto apagado", () => {
    const story = { steps: [0, 1, 1, 3], manifestoLit: 10, manifestoTotal: 17 };
    const { problems } = evaluate([run({ path: "/el-nino", story })]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain("passos 0,1,1,3");
    expect(problems[1]).toContain("10/17");
  });

  it("história com movimento reduzido: todos os passos visíveis", () => {
    const ok = { steps: ["todos"], manifestoLit: 17, manifestoTotal: 17 };
    expect(evaluate([run({ path: "/el-nino", reducedMotion: true, story: ok })]).problems).toEqual([]);
    const bad = { steps: ["faltando"], manifestoLit: 17, manifestoTotal: 17 };
    expect(evaluate([run({ path: "/el-nino", reducedMotion: true, story: bad })]).problems[0]).toContain(
      "não estão todos visíveis",
    );
  });

  it("página que encolhe ou estoura depois de alargar a janela é problema", () => {
    const { problems } = evaluate([run()], [resize({ mainAfterResize: 856, overflowAfterResize: 12 })]);
    expect(problems[0]).toContain("856px (aberta direto: 1152px)");
    expect(problems[0]).toContain("rolagem lateral de 12px");
  });

  it("relatório vazio não passa", () => {
    expect(evaluate([]).problems).toContain("nenhuma página foi verificada");
  });
});

describe("configuração do QA", () => {
  it("cobre as páginas públicas, computador e celular, com alvo de 44 px", () => {
    expect(PAGES).toEqual(["/", "/el-nino", "/sobre"]);
    expect(VIEWPORTS.desktop.width).toBe(1440);
    expect(VIEWPORTS.mobile).toMatchObject({ width: 390, mobile: true });
    expect(MIN_TOUCH_PX).toBe(44);
  });
});
