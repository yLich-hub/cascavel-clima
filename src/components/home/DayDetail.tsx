"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Glass } from "@/components/home/Glass";
import { formatDayLabel, formatDayLong, formatMm, formatPct, formatTemp } from "@/lib/format";
import { rainAxisMax, type DayDetail as Day, type HourSlot } from "@/lib/weather/days";

/**
 * Cores das barras de chuva, validadas em tests/day-detail.test.tsx: sobre o
 * balão escuro (`.glass-inner`) dentro do card, contraste ≥ 3:1 em qualquer
 * cena. A hora selecionada fica mais clara.
 */
export const RAIN_BAR = "#86b6ef";
export const RAIN_BAR_SELECTED = "#cde2fb";

const HEIGHT = 150;
const PAD = { top: 10, right: 8, bottom: 22, left: 36 };

const hourRange = (slot: HourSlot) => `${slot.startHour}h–${(slot.startHour + 1) % 24 || 24}h`;

/** Detalhe de um dia: abas com os 7 dias e chuva prevista hora a hora. */
export function DayDetailCard({ days, today }: { days: Day[]; today: string }) {
  const [selectedDate, setSelectedDate] = useState(days[0]?.date ?? today);
  const tabsId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // Depois de uma atualização automática, o dia escolhido pode ter saído da lista (virou ontem).
  const index = Math.max(0, days.findIndex((day) => day.date === selectedDate));
  const day = days[index];

  if (!day) return null;

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    const moves: Record<string, number> = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: days.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + days.length) % days.length;
    setSelectedDate(days[next].date);
    tabRefs.current[next]?.focus();
  }

  return (
    <Glass labelledBy="detalhe-do-dia">
      <h2 id="detalhe-do-dia" className="text-base font-medium">
        Detalhe do dia: chuva hora a hora
      </h2>

      <div role="tablist" aria-label="Escolha o dia" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((item, i) => {
          const selected = i === index;
          return (
            <button
              key={item.date}
              ref={(element) => {
                tabRefs.current[i] = element;
              }}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${i}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setSelectedDate(item.date)}
              onKeyDown={onTabKey}
              className={`shrink-0 rounded-xl px-3 py-2 text-center text-sm ring-1 outline-none focus-visible:ring-2 focus-visible:ring-white ${
                selected ? "glass-inner font-bold text-white ring-white/60" : "font-medium text-white/90 ring-white/20 hover:ring-white/40"
              }`}
            >
              <span className="block">{formatDayLabel(item.date, today)}</span>
              <span className="block text-xs text-white/90">
                {formatTemp(item.minC)} / {formatTemp(item.maxC)}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-tab-${index}`} className="mt-3">
        <p className="text-lg font-bold">{capitalize(formatDayLong(day.date))}</p>
        <p className="mt-1 text-sm text-white/90">
          Mínima {formatTemp(day.minC)} · máxima {formatTemp(day.maxC)} · chuva no dia {formatMm(day.precipitationSumMm)}{" "}
          (chance de até {formatPct(day.precipitationProbMaxPct)} em alguma hora)
        </p>
        <DayHours key={day.date} day={day} isToday={day.date === today} />
      </div>
    </Glass>
  );
}

function DayHours({ day, isToday }: { day: Day; isToday: boolean }) {
  const { hours } = day;
  if (hours.length === 0) {
    return <p className="mt-3 text-sm text-white/90">Previsão hora a hora indisponível para este dia.</p>;
  }

  const anyRain = hours.some((slot) => (slot.precipitationMm ?? 0) > 0);
  return (
    <>
      {isToday && <p className="mt-1 text-sm text-white/90">Hoje: só as horas que ainda não passaram.</p>}
      <div className="glass-inner mt-3 rounded-2xl p-3 ring-1 ring-white/20">
        <RainBars hours={hours} />
      </div>
      {!anyRain && (
        <p className="mt-2 text-sm text-white/90">
          Nenhuma hora com chuva prevista em milímetros neste dia (0,0 mm em todas as horas).
        </p>
      )}
      <p className="mt-2 text-xs text-white/90">
        Barras: chuva prevista em cada hora (eixo vertical em mm). Cada barra é a hora que começa no horário do eixo
        (ex.: 15h = das 15h às 16h). Toque ou passe o mouse para ver a chance de chuva e a temperatura.
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer underline underline-offset-2">Ver todas as horas em tabela</summary>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl ring-1 ring-white/20" tabIndex={0} role="region" aria-label="Horas do dia">
          <table className="w-full text-left">
            <caption className="sr-only">Previsão hora a hora de {formatDayLong(day.date)}</caption>
            <thead>
              <tr>
                <th scope="col" className="px-3 py-1.5">Hora</th>
                <th scope="col" className="px-3 py-1.5 text-right">Chuva</th>
                <th scope="col" className="px-3 py-1.5 text-right">Chance</th>
                <th scope="col" className="px-3 py-1.5 text-right">Temp.</th>
              </tr>
            </thead>
            <tbody>
              {hours.map((slot) => (
                <tr key={slot.time} className="border-t border-white/10">
                  <td className="px-3 py-1">{hourRange(slot)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{formatMm(slot.precipitationMm)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{formatPct(slot.precipitationProbPct)}</td>
                  <td className="px-3 py-1 text-right tabular-nums">{formatTemp(slot.temperatureC)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

/** Barras de chuva por hora (eixo único em mm), com leitura da hora escolhida acima. */
function RainBars({ hours }: { hours: HourSlot[] }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  // Começa na hora mais chuvosa (ou na primeira, se não houver chuva).
  const [selected, setSelected] = useState(() => {
    const values = hours.map((slot) => slot.precipitationMm ?? 0);
    const max = Math.max(...values);
    return max > 0 ? values.indexOf(max) : 0;
  });

  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(220, Math.round(entry.contentRect.width))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const yMax = rainAxisMax(hours.map((slot) => slot.precipitationMm));
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slotW = plotW / hours.length;
  const barW = Math.min(24, Math.max(2, slotW - 2));
  const y = (mm: number) => PAD.top + (1 - mm / yMax) * plotH;
  const ticks = [0, yMax / 2, yMax];
  const current = hours[Math.min(selected, hours.length - 1)];

  function selectAt(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const i = Math.floor((event.clientX - rect.left - PAD.left) / slotW);
    setSelected(Math.min(hours.length - 1, Math.max(0, i)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: selected - 1, ArrowRight: selected + 1, Home: 0, End: hours.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    setSelected(Math.min(hours.length - 1, Math.max(0, moves[event.key])));
  }

  return (
    <div
      ref={wrapper}
      role="group"
      tabIndex={0}
      aria-label="Chuva por hora, em milímetros. Use as setas para percorrer as horas."
      onKeyDown={onKeyDown}
      className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <p aria-live="polite" className="mb-1 min-h-6 text-sm text-white/90">
        <strong className="text-base text-white">{formatMm(current.precipitationMm)}</strong> das {hourRange(current)} ·
        chance {formatPct(current.precipitationProbPct)} · {formatTemp(current.temperatureC)}
      </p>
      <svg
        aria-hidden="true"
        width={width}
        height={HEIGHT}
        className="block max-w-full touch-pan-y select-none"
        onPointerMove={selectAt}
        onPointerDown={selectAt}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="white" strokeOpacity={t === 0 ? 0.45 : 0.12} />
            <text x={PAD.left - 6} y={y(t)} dy="0.35em" textAnchor="end" fontSize="12" fill="white" fillOpacity={0.9}>
              {t.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        {hours.map((slot, i) => {
          const mm = slot.precipitationMm ?? 0;
          const top = y(mm);
          const h = y(0) - top;
          const x = PAD.left + slotW * i + (slotW - barW) / 2;
          return (
            <g key={slot.time}>
              {i === selected && (
                <rect x={PAD.left + slotW * i} y={PAD.top} width={slotW} height={plotH} fill="white" fillOpacity={0.08} />
              )}
              {h >= 0.5 && (
                <path d={roundedTop(x, top, barW, h)} fill={i === selected ? RAIN_BAR_SELECTED : RAIN_BAR} />
              )}
            </g>
          );
        })}
        {hours.map((slot, i) =>
          slot.startHour % 3 === 0 || hours.length <= 8 ? (
            <text
              key={slot.time}
              x={PAD.left + slotW * (i + 0.5)}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize="12"
              fill="white"
              fillOpacity={0.9}
            >
              {slot.startHour}h
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/** Barra com ponta arredondada (até 4 px) e base reta na linha do zero. */
function roundedTop(x: number, top: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${top + h}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${top + h}Z`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
