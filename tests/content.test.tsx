import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/sobre/page";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AlertsBox } from "@/components/weather/AlertsBox";
import { OFFICIAL_ALERT_SOURCES } from "@/lib/config";

/**
 * Regras de texto do projeto (seção 7 da proposta): o site não afirma ausência
 * de alertas e não atribui eventos locais ao El Niño.
 */
const FORBIDDEN = [
  /sem alertas/i,
  /nenhum alerta/i,
  /não há alertas/i,
  /causad[oa]s? pel[oa] El Ni[ñn]o/i,
  /culpa do El Ni[ñn]o/i,
  /por causa do El Ni[ñn]o/i,
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(tsx?|mdx?)$/.test(entry.name) ? [path] : [];
  });
}

/** Remove comentários: eles explicam as regras e podem citar as frases proibidas. */
const stripComments = (code: string) =>
  code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("regras de texto", () => {
  const files = sourceFiles(join(process.cwd(), "src"));

  it("encontra os arquivos da interface", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(FORBIDDEN.map((pattern) => [pattern.source, pattern]))(
    "nenhum texto exibido contém /%s/",
    (_name, pattern) => {
      const offenders = files.filter((file) => pattern.test(stripComments(readFileSync(file, "utf8"))));
      expect(offenders).toEqual([]);
    },
  );
});

describe("AlertsBox", () => {
  const html = renderToStaticMarkup(<AlertsBox />);

  it("deixa claro que o site não emite nem verifica alertas", () => {
    expect(html).toContain("não emite alertas");
    expect(html).toContain("não verifica se há alertas ativos");
  });

  it("lista todas as fontes oficiais, abrindo em nova aba com segurança", () => {
    for (const source of OFFICIAL_ALERT_SOURCES) {
      expect(html).toContain(`href="${source.url}"`);
    }
    const external = html.match(/<a [^>]*>/g) ?? [];
    expect(external).toHaveLength(OFFICIAL_ALERT_SOURCES.length);
    for (const tag of external) expect(tag).toContain('rel="noopener noreferrer"');
  });

  it("tem o id usado pelo link da tela 'indisponível'", () => {
    expect(html).toContain('id="alertas-oficiais"');
  });
});

describe("SiteFooter", () => {
  it("credita o Open-Meteo com link para a licença em todas as páginas", () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    expect(html).toContain('href="https://open-meteo.com/"');
    expect(html).toContain('href="https://open-meteo.com/en/licence"');
    expect(html).toContain("Não é um serviço meteorológico oficial");
  });
});

describe("Página Sobre", () => {
  const html = renderToStaticMarkup(<AboutPage />);

  it("explica a diferença entre previsão, alerta e clima", () => {
    expect(html).toContain("Previsão do tempo");
    expect(html).toContain("Alertas oficiais");
    expect(html).toContain("Contexto climático (El Niño)");
  });

  it("mostra os limites de atualização que o código realmente usa", () => {
    expect(html).toContain("no máximo a cada 10 min");
    expect(html).toContain("desatualização após 30 min");
    expect(html).toContain("exibidas após 3 h");
    expect(html).toContain("aviso após 6 h");
    expect(html).toContain("exibida após 24 h");
  });

  it("explica que 'agora' é estimativa e o significado do horário da chuva", () => {
    expect(html).toContain("não</strong> medição");
    expect(html).toContain("das 15h às 16h");
  });

  it("lista todas as fontes oficiais e a licença dos dados", () => {
    for (const source of OFFICIAL_ALERT_SOURCES) expect(html).toContain(`href="${source.url}"`);
    expect(html).toContain("CC BY 4.0");
  });
});

describe("página 404", () => {
  it("está em português e leva de volta às páginas do site", async () => {
    const { default: NotFound } = await import("@/app/not-found");
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain("Página não encontrada");
    for (const href of ["/", "/el-nino", "/sobre"]) expect(html).toContain(`href="${href}"`);
    expect(html).not.toMatch(/could not be found/i);
  });
});

describe("tema escuro (regressão: texto escuro ilegível na página El Niño)", () => {
  const files = sourceFiles(join(process.cwd(), "src"));

  it("nenhum componente usa texto escuro, que some sobre o fundo escuro do site", () => {
    const darkText = /text-(zinc|slate|sky|gray|neutral|stone)-[6-9]00/;
    expect(files.filter((file) => darkText.test(readFileSync(file, "utf8")))).toEqual([]);
  });

  it("o tema não depende mais de body:has(...) (vazava da Início para a página seguinte)", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/body:has\(/);
  });

  it("Sobre e 404 têm títulos em negrito", async () => {
    const { default: NotFound } = await import("@/app/not-found");
    expect(renderToStaticMarkup(<AboutPage />)).toMatch(/<h1 class="[^"]*font-bold/);
    expect(renderToStaticMarkup(<NotFound />)).toMatch(/<h1 class="[^"]*font-bold/);
  });
});
