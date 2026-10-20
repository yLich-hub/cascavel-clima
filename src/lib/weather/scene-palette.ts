import type { RGB } from "@/lib/contrast";

/**
 * Cores das cenas, do véu de contraste e do vidro dos cards, num lugar só.
 * tests/contrast.test.ts calcula, para cada cena, o contraste do texto branco
 * no pior caso (ponto mais claro da cena sob o véu mais fraco). Mudou uma cor
 * aqui? Rode os testes.
 */

export type CloudTone = "white" | "gray" | "dark";

/** Centro do sol: o ponto mais claro de qualquer cena. */
export const SUN_PEAK: RGB = [255, 251, 235];

export const CLOUD_TONES: Record<CloudTone, { cloud: RGB; light: RGB; opacity: number }> = {
  white: { cloud: [236, 241, 247], light: [255, 255, 255], opacity: 0.85 },
  gray: { cloud: [150, 160, 175], light: [200, 208, 219], opacity: 0.8 },
  dark: { cloud: [58, 66, 80], light: [104, 114, 130], opacity: 0.92 },
};

/** Sol baixo do amanhecer/entardecer: mais alaranjado e menos claro que o do meio do dia. */
export const LOW_SUN_PEAK: RGB = [255, 214, 160];

export const FOG: { color: RGB; alpha: number } = { color: [225, 230, 236], alpha: 0.55 };

/** Véu escuro em gradiente sobre toda cena (topo → base). */
export const VEIL = [
  { stop: 0, alpha: 0.28 },
  { stop: 38, alpha: 0.08 },
  { stop: 62, alpha: 0.12 },
  { stop: 100, alpha: 0.42 },
] as const;

/** Véu extra, uniforme, nas cenas claras (sol, nuvens brancas, névoa, neve de dia). */
export const VEIL_BRIGHT_ALPHA = 0.2;

/** Vidro dos cards: cor escura translúcida (sobre o fundo já desfocado). */
export const GLASS: { color: RGB; alpha: number } = { color: [2, 6, 23], alpha: 0.45 };

/** Texto secundário (`text-white/90`): o mais transparente permitido para texto pequeno. */
export const TEXT_SECONDARY_ALPHA = 0.9;

export const rgb = (color: RGB, alpha = 1) => `rgb(${color.join(" ")} / ${alpha})`;

export const veilGradient = () =>
  `linear-gradient(180deg, ${VEIL.map((v) => `${rgb([0, 0, 0], v.alpha)} ${v.stop}%`).join(", ")})`;

export const sunGradient = () =>
  `radial-gradient(circle, ${rgb(SUN_PEAK)} 0%, ${rgb([255, 236, 179], 0.85)} 10%, ${rgb(
    [255, 214, 140],
    0.45,
  )} 26%, ${rgb([255, 214, 140], 0.12)} 46%, transparent 66%)`;

/**
 * Cena de oceano da página El Niño (ilustração, não representa dados).
 * `warm` é a "mancha quente" no Pacífico: o ponto mais claro da cena.
 */
export const OCEAN = {
  sky: ["#071226", "#0d2a4d"] as [string, string],
  waves: [
    [17, 63, 107],
    [12, 48, 86],
    [7, 33, 62],
  ] as RGB[],
  warm: { color: [255, 138, 66] as RGB, alpha: 0.55 },
  hot: { color: [255, 196, 120] as RGB, alpha: 0.35 },
};

export const lowSunGradient = () =>
  `radial-gradient(circle, ${rgb(LOW_SUN_PEAK)} 0%, ${rgb([255, 170, 110], 0.8)} 14%, ${rgb(
    [255, 140, 90],
    0.35,
  )} 32%, ${rgb([255, 120, 80], 0.1)} 50%, transparent 68%)`;

export const warmGradient = () =>
  `radial-gradient(closest-side, ${rgb(OCEAN.hot.color, OCEAN.hot.alpha)} 0%, ${rgb(
    OCEAN.warm.color,
    OCEAN.warm.alpha,
  )} 35%, ${rgb(OCEAN.warm.color, 0.18)} 65%, transparent 100%)`;

/**
 * "Balões" dentro dos cards (horas, selos, destaques). Escurecem um pouco o
 * vidro em vez de clarear: com branco por cima, o texto caía abaixo de 4,5:1
 * nas cenas claras. O destaque visual vem da borda/faixa colorida.
 * Classe CSS correspondente: `.glass-inner` (globals.css, valor testado).
 */
export const INNER = { color: [2, 6, 23] as RGB, alpha: 0.25 };
