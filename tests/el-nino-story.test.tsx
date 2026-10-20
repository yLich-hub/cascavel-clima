import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ElNinoStory } from "@/components/enso/ElNinoStory";
import { Manifesto, wordRange } from "@/components/enso/Manifesto";
import { CountUpText, splitNumber, withNumber } from "@/components/motion/CountUp";
import { EL_NINO } from "@/content/el-nino";
import { blend, contrastRatio, type RGB } from "@/lib/contrast";
import { GLASS, OCEAN, VEIL } from "@/lib/weather/scene-palette";

describe("números que contam", () => {
  it.each([
    ["+3,3 °C", { before: "", sign: "+", value: 3.3, digits: 1, after: " °C" }],
    ["> 83%", { before: "> ", sign: "", value: 83, digits: 0, after: "%" }],
    ["−0,8 °C", { before: "", sign: "−", value: 0.8, digits: 1, after: " °C" }],
    ["+1,69 °C", { before: "", sign: "+", value: 1.69, digits: 2, after: " °C" }],
  ])("lê o número de %s", (text, expected) => {
    expect(splitNumber(text)).toEqual(expected);
  });

  it("texto sem número não anima", () => {
    expect(splitNumber("El Niño")).toBeNull();
    expect(withNumber("El Niño", 5)).toBe("El Niño");
  });

  it("durante a contagem mantém sinal, casas decimais e unidade", () => {
    expect(withNumber("+3,3 °C", 1.234)).toBe("+1,2 °C");
    expect(withNumber("> 83%", 41.6)).toBe("> 42%");
    expect(withNumber("+1,69 °C", 0)).toBe("+0,00 °C");
  });

  it("o HTML do servidor já traz o valor real (sem JavaScript, buscadores e leitores de tela)", () => {
    const html = renderToStaticMarkup(<CountUpText text="+3,3 °C" />);
    expect(html.match(/\+3,3 °C/g)).toHaveLength(2); // visível + leitor de tela
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("sr-only");
  });
});

describe("história do El Niño", () => {
  const live = { valueText: "+3,3 °C", weekCenter: "2026-10-14", statusLabel: "El Niño em curso" };

  it("quatro passos, com o título da seção e a fonte da definição", () => {
    const html = renderToStaticMarkup(<ElNinoStory live={live} />);
    expect(html.match(/class="story-step"/g)).toHaveLength(4);
    expect(html).toMatch(/<h2 id="o-que-e" class="[^"]*font-bold/);
    expect(html).toContain(EL_NINO.whatIs[0].text);
    expect(html).toContain("(Fonte:");
  });

  it("último passo com o dado do NOAA: valor, semana e situação oficial", () => {
    const html = renderToStaticMarkup(<ElNinoStory live={live} />);
    expect(html).toContain("+3,3 °C");
    expect(html).toContain("semana de 14/10/2026");
    expect(html).toContain("Situação oficial: El Niño em curso");
  });

  it("sem dado, não inventa número: aponta para os números ao vivo", () => {
    // "+0,5 °C" é o limite fixo do NOAA citado no texto; nenhum outro valor pode aparecer.
    const html = renderToStaticMarkup(<ElNinoStory live={null} />).replace("+0,5 °C", "");
    expect(html).not.toMatch(/[+−]\d,\d °C/);
    expect(html).toContain("Os números atualizados do NOAA estão em");
  });

  it("o mar é ilustração (escondido de leitores de tela)", () => {
    expect(renderToStaticMarkup(<ElNinoStory live={null} />)).toMatch(/<div aria-hidden="true" class="story-sea">/);
  });
});

describe("manifesto", () => {
  const html = renderToStaticMarkup(<Manifesto />);

  it("frase inteira para leitores de tela; palavras separadas só no visual", () => {
    expect(html).toContain('<span class="sr-only">Um dia de chuva forte ou de calor em Cascavel não pode ser atribuído ao El Niño</span>');
    expect(html.match(/class="manifesto-word"/g)?.length).toBeGreaterThan(10);
  });

  it("cada palavra acende depois da anterior, dentro do percurso", () => {
    const ranges = Array.from({ length: 16 }, (_, i) => wordRange(i, 16));
    for (let i = 1; i < ranges.length; i++) expect(ranges[i][0]).toBeGreaterThan(ranges[i - 1][0]);
    for (const [from, to] of ranges) {
      expect(from).toBeGreaterThanOrEqual(0);
      expect(to).toBeLessThanOrEqual(100);
    }
  });
});

describe("CSS das cenas (globals.css)", () => {
  const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");
  const block = css.slice(css.indexOf("História do El Niño"), css.indexOf("@keyframes story-step {"));

  it("animações só com suporte e sem 'reduzir movimento'", () => {
    const guarded = block.indexOf("@media (prefers-reduced-motion: no-preference)");
    expect(guarded).toBeGreaterThan(0);
    for (const rule of [".el-nino-story {", ".manifesto-word {", ".story-step {"]) {
      expect(block.indexOf(rule), rule).toBeGreaterThan(guarded);
    }
    expect(block).toContain("@supports (animation-timeline: view())");
  });

  it("palavras do manifesto usam gradiente recortado, não opacidade baixa", () => {
    const word = block.slice(block.indexOf(".manifesto-word {"));
    expect(word).toContain("background-clip: text");
    expect(word.slice(0, word.indexOf("}"))).not.toContain("opacity");
  });
});

describe("contraste do rótulo laranja dos passos", () => {
  it("text-orange-300 ≥ 4,5:1 no vidro, mesmo sobre o ponto mais claro do oceano", () => {
    const orange: RGB = [253, 186, 116]; // tailwind orange-300
    const weakestVeil = Math.min(...VEIL.map((v) => v.alpha));
    const brightest = blend(OCEAN.hot.color, OCEAN.hot.alpha, blend(OCEAN.warm.color, OCEAN.warm.alpha, OCEAN.waves[0]));
    const card = blend(GLASS.color, GLASS.alpha, blend([0, 0, 0], weakestVeil, brightest));
    expect(contrastRatio(orange, card)).toBeGreaterThanOrEqual(4.5);
  });
});
