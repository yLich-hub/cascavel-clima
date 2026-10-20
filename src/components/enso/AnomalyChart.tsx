"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { DIVERGING, THRESHOLD_C, anomalyTone, formatAnomaly, toneColor } from "@/lib/enso/present";

/** `label` vai na leitura acima do gráfico; `short`, no eixo. */
export type ChartPoint = { key: string; label: string; short: string; value: number };

type Props = {
  points: ChartPoint[];
  kind: "bars" | "line";
  /** Casas decimais como publicadas pela fonte. */
  digits: number;
  /** Nome do gráfico para leitores de tela. */
  title: string;
  /** Texto antes do rótulo na leitura, ex.: "semana de". */
  labelPrefix?: string;
};

const HEIGHT = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };
const DEFAULT_WIDTH = 640;

/**
 * Gráfico de anomalias (°C) com eixo único, linha do zero e linhas de ±0,5 °C
 * (limite do NOAA). Cores pelo par divergente validado; o texto fica sempre em
 * branco. Passar o dedo/mouse ou usar as setas mostra o valor na leitura acima
 * do gráfico; a tabela com todos os valores fica fora deste componente.
 */
export function AnomalyChart({ points, kind, digits, title, labelPrefix = "" }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [selected, setSelected] = useState(points.length - 1);
  const gradientId = useId();

  // Desenha em pixels reais (texto legível no celular), medindo a largura disponível.
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const yMin = Math.min(-1, Math.floor(Math.min(...values) * 2) / 2);
  const yMax = Math.max(1, Math.ceil(Math.max(...values) * 2) / 2);
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / points.length;
  const y = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * plotH;
  const xCenter = (i: number) => PAD.left + slot * (i + 0.5);

  const ticks: number[] = [];
  for (let t = Math.ceil(yMin); t <= Math.floor(yMax); t++) ticks.push(t);

  const xLabels = pickLabels(points.length, Math.max(2, Math.floor(plotW / 110)));
  const current = points[Math.min(selected, points.length - 1)];

  function selectAt(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const index = Math.floor((event.clientX - rect.left - PAD.left) / slot);
    setSelected(Math.min(points.length - 1, Math.max(0, index)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowLeft: selected - 1,
      ArrowRight: selected + 1,
      Home: 0,
      End: points.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setSelected(Math.min(points.length - 1, Math.max(0, moves[event.key])));
  }

  return (
    <div
      ref={wrapper}
      role="group"
      aria-label={`${title}. Use as setas para percorrer os valores.`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <p aria-live="polite" className="mb-2 min-h-6 text-sm text-white/90">
        <strong className="text-base text-white">{formatAnomaly(current.value, digits)}</strong>{" "}
        {labelPrefix}
        {current.label}
      </p>
      <svg
        aria-hidden="true"
        width={width}
        height={HEIGHT}
        className="block max-w-full touch-pan-y select-none"
        onPointerMove={selectAt}
        onPointerDown={selectAt}
        onPointerLeave={() => setSelected(points.length - 1)}
      >
        {kind === "line" && (
          // Cor da linha muda nos limites de ±0,5 °C, como as barras.
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={PAD.top} y2={PAD.top + plotH}>
              {gradientStops(y, PAD.top, plotH).map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>
          </defs>
        )}

        {/* Grade recessiva: linhas inteiras finas; zero e ±0,5 um pouco mais visíveis. */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="white" strokeOpacity={t === 0 ? 0.45 : 0.12} />
            <text x={PAD.left - 6} y={y(t)} dy="0.35em" textAnchor="end" fontSize="12" fill="white" fillOpacity={0.9}>
              {t > 0 ? `+${t}` : t < 0 ? `−${-t}` : "0"}
            </text>
          </g>
        ))}
        {[THRESHOLD_C, -THRESHOLD_C].map((t) => (
          <line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="white" strokeOpacity={0.3} />
        ))}

        {kind === "bars"
          ? points.map((p, i) => (
              <path
                key={p.key}
                d={barPath(xCenter(i), Math.min(24, Math.max(2, slot - 2)), y(0), y(p.value))}
                fill={toneColor(anomalyTone(p.value))}
                fillOpacity={i === selected ? 1 : 0.85}
              />
            ))
          : (
            <polyline
              points={points.map((p, i) => `${xCenter(i)},${y(p.value)}`).join(" ")}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

        {/* Cursor: linha vertical no ponto selecionado. */}
        <line
          x1={xCenter(selected)}
          x2={xCenter(selected)}
          y1={PAD.top}
          y2={PAD.top + plotH}
          stroke="white"
          strokeOpacity={0.5}
        />
        {kind === "line" && (
          <circle
            cx={xCenter(selected)}
            cy={y(current.value)}
            r={5}
            fill={toneColor(anomalyTone(current.value))}
            stroke="#020617"
            strokeWidth={2}
          />
        )}

        {xLabels.map((i) => (
          <text
            key={points[i].key}
            x={xCenter(i)}
            y={HEIGHT - 6}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize="12"
            fill="white"
            fillOpacity={0.9}
          >
            {points[i].short}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-xs text-white/90">
        Eixo vertical: diferença em °C em relação à média 1991–2020. Linhas claras em ±0,5 °C (limite do NOAA).
      </p>
    </div>
  );
}

/** Barra que cresce da linha do zero, com ponta arredondada (4 px) e base reta. */
function barPath(cx: number, w: number, zeroY: number, valueY: number): string {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const height = Math.abs(valueY - zeroY);
  const r = Math.min(4, w / 2, height);
  if (height < 0.5) return `M${x0},${zeroY}H${x1}`;
  const up = valueY < zeroY;
  const tip = valueY;
  const dir = up ? 1 : -1; // a ponta arredondada fica do lado do valor
  return [
    `M${x0},${zeroY}`,
    `V${tip + dir * r}`,
    `Q${x0},${tip} ${x0 + r},${tip}`,
    `H${x1 - r}`,
    `Q${x1},${tip} ${x1},${tip + dir * r}`,
    `V${zeroY}`,
    "Z",
  ].join(" ");
}

/** Paradas duras do degradê: quente acima de +0,5, neutro no meio, frio abaixo de −0,5. */
function gradientStops(y: (v: number) => number, top: number, height: number) {
  const offset = (v: number) => Math.min(1, Math.max(0, (y(v) - top) / height));
  const warm = offset(THRESHOLD_C);
  const cool = offset(-THRESHOLD_C);
  return [
    { offset: 0, color: DIVERGING.warm },
    { offset: warm, color: DIVERGING.warm },
    { offset: warm, color: DIVERGING.neutral },
    { offset: cool, color: DIVERGING.neutral },
    { offset: cool, color: DIVERGING.cool },
    { offset: 1, color: DIVERGING.cool },
  ];
}

/** Até `max` rótulos no eixo X, sempre incluindo o primeiro e o último. */
function pickLabels(count: number, max: number): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => Math.round(i * step));
}
