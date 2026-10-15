export type Point = { x: number; y: number };

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Caminho SVG suave passando por todos os pontos (Catmull-Rom convertido em
 * curvas de Bézier). Sem "overshoot" exagerado: tensão 0,5 (padrão).
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${round(points[0].x)},${round(points[0].y)}`;

  let d = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(p2.x)},${round(p2.y)}`;
  }
  return d;
}

/** Converte valores numa faixa [min, max] para coordenadas y (maior valor = mais alto na tela). */
export function scaleY(value: number, min: number, max: number, top: number, bottom: number): number {
  if (max === min) return (top + bottom) / 2;
  return bottom - ((value - min) / (max - min)) * (bottom - top);
}
