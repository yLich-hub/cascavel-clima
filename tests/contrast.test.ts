import { describe, expect, it } from "vitest";
import { blend, contrastRatio, type RGB } from "@/lib/contrast";
import {
  CLOUD_TONES,
  FOG,
  GLASS,
  INNER,
  LOW_SUN_PEAK,
  OCEAN,
  SUN_PEAK,
  TEXT_SECONDARY_ALPHA,
  VEIL,
  VEIL_BRIGHT_ALPHA,
} from "@/lib/weather/scene-palette";
import { sceneFor, type Scene } from "@/lib/weather/scenes";

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const WCAG_AA_TEXT = 4.5;

const hex = (value: string): RGB =>
  [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)) as unknown as RGB;

/** Cores mais claras que podem aparecer atrás de um card, em qualquer ponto da cena. */
function brightestPoints(scene: Scene): Array<[string, RGB]> {
  const [top, bottom] = scene.sky.map(hex);
  const points: Array<[string, RGB]> = [
    ["céu (topo)", top],
    ["céu (base)", bottom],
  ];
  if (scene.sun) points.push(["centro do sol", SUN_PEAK]);
  if (scene.lowSun) points.push(["centro do sol baixo", LOW_SUN_PEAK]);
  if (scene.clouds.count > 0) points.push(["nuvem (parte clara)", CLOUD_TONES[scene.clouds.tone].light]);
  if (scene.fog) points.push(["névoa", blend(FOG.color, FOG.alpha, bottom)]);
  if (scene.snow > 0) points.push(["floco de neve", WHITE]);
  return points;
}

/** Fundo efetivo de um card: ponto da cena → véu mais fraco (+ véu extra) → vidro. */
function cardBackground(point: RGB, scene: Scene): RGB {
  const weakestVeil = Math.min(...VEIL.map((v) => v.alpha));
  let color = blend(BLACK, weakestVeil, point);
  if (scene.bright) color = blend(BLACK, VEIL_BRIGHT_ALPHA, color);
  return blend(GLASS.color, GLASS.alpha, color);
}

const CODES = [null, 0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 66, 71, 73, 75, 80, 81, 82, 95, 96, 97, 99];

describe("contraste do texto branco sobre os cards de vidro (pior caso de cada cena)", () => {
  for (const twilight of [null, "dawn", "dusk"] as const) {
    for (const isDay of [true, false]) {
      for (const code of CODES) {
        const scene = sceneFor(code, isDay, twilight);
        it(`${scene.id} (código ${code}, ${isDay ? "dia" : "noite"}, ${scene.phase}) ≥ ${WCAG_AA_TEXT}:1`, () => {
          for (const [where, point] of brightestPoints(scene)) {
            for (const [layer, background] of [
              ["card", cardBackground(point, scene)],
              ["balão dentro do card", blend(INNER.color, INNER.alpha, cardBackground(point, scene))],
            ] as const) {
              const secondary = blend(WHITE, TEXT_SECONDARY_ALPHA, background);
              expect(contrastRatio(WHITE, background), `texto branco, ${layer}, sobre ${where}`).toBeGreaterThanOrEqual(
                WCAG_AA_TEXT,
              );
              expect(contrastRatio(secondary, background), `texto secundário, ${layer}, sobre ${where}`).toBeGreaterThanOrEqual(
                WCAG_AA_TEXT,
              );
            }
          }
        });
      }
    }
  }
});

describe("contrastRatio", () => {
  it("bate com valores de referência da WCAG", () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 1);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
    // #767676 sobre branco é o cinza mais claro que ainda passa 4,5:1
    expect(contrastRatio([118, 118, 118], WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio([119, 119, 119], WHITE)).toBeLessThan(4.5);
  });
});

describe("vidro do cabeçalho/rodapé (globals.css)", () => {
  it("usa a mesma cor e opacidade de GLASS testada acima", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");
    const start = css.indexOf(".site-header,\n.site-footer {");
    expect(start).toBeGreaterThanOrEqual(0);
    const block = css.slice(start, css.indexOf("}", start));
    expect(block).toContain(`background: rgb(${GLASS.color.join(" ")} / ${GLASS.alpha});`);
  });
});

describe("contraste na cena de oceano (página El Niño)", () => {
  const weakestVeil = Math.min(...VEIL.map((v) => v.alpha));
  const points: Array<[string, RGB]> = [
    ["céu", hex(OCEAN.sky[1])],
    ...OCEAN.waves.map((wave, i): [string, RGB] => [`onda ${i + 1}`, wave]),
    // Mancha quente sobre a onda mais clara: o ponto mais claro da cena.
    ["mancha quente", blend(OCEAN.hot.color, OCEAN.hot.alpha, blend(OCEAN.warm.color, OCEAN.warm.alpha, OCEAN.waves[0]))],
  ];
  it.each(points)("texto branco legível sobre %s (card e balão) ≥ 4,5:1", (_where, point) => {
    const card = blend(GLASS.color, GLASS.alpha, blend(BLACK, weakestVeil, point));
    for (const background of [card, blend(INNER.color, INNER.alpha, card)]) {
      expect(contrastRatio(WHITE, background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      expect(contrastRatio(blend(WHITE, TEXT_SECONDARY_ALPHA, background), background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    }
  });
});

describe("balões dentro dos cards (globals.css)", () => {
  it("a classe .glass-inner usa a mesma cor e opacidade de INNER testada acima", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");
    const start = css.indexOf(".glass-inner {");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(css.slice(start, css.indexOf("}", start))).toContain(
      `background: rgb(${INNER.color.join(" ")} / ${INNER.alpha});`,
    );
  });
});
