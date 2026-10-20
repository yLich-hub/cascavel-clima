import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { blend, contrastRatio, type RGB } from "@/lib/contrast";
import { INNER } from "@/lib/weather/scene-palette";

vi.mock("next/navigation", () => ({ usePathname: () => "/el-nino" }));

const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");
const rule = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
};

describe("botões em pílula", () => {
  it(".pill-glass usa o fundo escuro dos balões (INNER, contraste testado)", () => {
    expect(rule(".pill-glass")).toContain(`background: rgb(${INNER.color.join(" ")} / ${INNER.alpha});`);
    expect(rule(".pill-selected")).toContain(`background: rgb(${INNER.color.join(" ")} / ${INNER.alpha});`);
  });

  it(".pill-light: texto escuro sobre fundo claro com contraste folgado", () => {
    const block = rule(".pill-light");
    expect(block).toContain("background: #f8fafc;");
    expect(block).toContain("color: #020617;");
    const ratio = contrastRatio([2, 6, 23], [248, 250, 252]);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it("alvo de toque de pelo menos 44 px", () => {
    expect(rule(".pill")).toContain("min-height: 2.75rem;");
  });

  it("estão na camada de componentes (utilitários do Tailwind continuam vencendo)", () => {
    expect(css.indexOf("@layer components {")).toBeLessThan(css.indexOf(".pill {"));
  });
});

describe("grão de filme", () => {
  const block = rule("body::after");

  it("bem leve, fixo e sem bloquear cliques", () => {
    const opacity = Number(/opacity: ([\d.]+);/.exec(block)?.[1]);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThanOrEqual(0.05);
    expect(block).toContain("pointer-events: none;");
    expect(block).toContain("position: fixed;");
  });

  it("é uma imagem pequena repetida, não filtro SVG (feTurbulence custava até 300 ms de bloqueio)", () => {
    expect(block).toContain('background-image: url("/grain.png");');
    expect(block).not.toContain("feTurbulence");
    const png = readFileSync("public/grain.png");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.length).toBeLessThan(12 * 1024);
  });

  it("some em alto contraste do sistema e na impressão", () => {
    expect(css).toMatch(/@media \(forced-colors: active\), print \{\n\s+body::after \{\n\s+display: none;/);
  });

  it("não muda o contraste do texto de forma relevante (pior caso: grão branco sobre o vidro)", () => {
    const opacity = Number(/opacity: ([\d.]+);/.exec(block)?.[1]);
    const glass: RGB = [12, 22, 40]; // vidro escuro típico sobre o oceano
    const worst = blend([255, 255, 255], opacity, glass);
    expect(contrastRatio([255, 255, 255], worst)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("cabeçalho fixo", () => {
  it("só fica fixo do tablet para cima (no celular a navegação é o menu inferior)", () => {
    const media = css.slice(css.indexOf("@media (min-width: 640px) {\n  .site-header {"));
    expect(media).toContain("position: sticky;");
    expect(css).toContain("html[data-scrolled] .site-header {");
  });

  it("a cena da história do El Niño fica logo abaixo dele", () => {
    expect(css).toContain("top: var(--header-h);");
    expect(css).toContain("height: calc(100svh - var(--header-h));");
  });

  it("página atual marcada em pílula", async () => {
    const { HeaderLinks } = await import("@/components/layout/MobileNav");
    const html = renderToStaticMarkup(<HeaderLinks />);
    expect(html).toMatch(/aria-current="page" class="pill pill-sm pill-selected"/);
  });
});

describe("escala de títulos", () => {
  it("utilitários display e headline com letras mais juntas e quebra equilibrada", () => {
    for (const name of ["display", "headline"]) {
      const block = rule(`@utility ${name}`);
      expect(block).toMatch(/letter-spacing: -0\.0\d+em;/);
      expect(block).toContain("text-wrap: balance;");
    }
  });

  it("títulos das páginas usam a escala", async () => {
    const { default: AboutPage } = await import("@/app/sobre/page");
    const { default: NotFound } = await import("@/app/not-found");
    expect(renderToStaticMarkup(<AboutPage />)).toMatch(/<h1 class="display font-bold">/);
    expect(renderToStaticMarkup(<NotFound />)).toMatch(/<h1 class="display mt-1 font-bold">/);
  });
});
