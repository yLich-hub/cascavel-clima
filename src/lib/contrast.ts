/** Cálculo de contraste da WCAG 2.x (usado para garantir texto legível sobre as cenas). */

export type RGB = readonly [number, number, number];

/** Cor `top` com opacidade `alpha` sobre a cor opaca `bottom`. */
export function blend(top: RGB, alpha: number, bottom: RGB): RGB {
  return [0, 1, 2].map((i) => top[i] * alpha + bottom[i] * (1 - alpha)) as unknown as RGB;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: RGB): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
