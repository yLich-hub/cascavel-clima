import { Glass } from "@/components/home/Glass";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { formatDayLabel, formatDayLong, formatMm, formatPct, formatTemp } from "@/lib/format";
import { scaleY, smoothPath } from "@/lib/svg";
import { describeWeatherCode } from "@/lib/weather/wmo-codes";
import type { DailyPoint } from "@/types/weather";

const COL = 100;
const H = 90;
const TOP = 18;
const BOTTOM = 72;

/** Próximos dias: máximas numa curva suave, com ícone e mínima de cada dia. */
export function WeekCurve({ daily, today }: { daily: DailyPoint[]; today: string }) {
  if (daily.length === 0) {
    return (
      <Glass labelledBy="proximos-dias">
        <h2 id="proximos-dias" className="text-base font-medium">
          Próximos dias
        </h2>
        <p className="mt-3 text-sm text-white/90">Previsão diária indisponível no momento.</p>
      </Glass>
    );
  }

  const width = COL * daily.length;
  const maxes = daily.map((day) => day.maxC).filter((v): v is number => v !== null);
  const lo = Math.min(...maxes);
  const hi = Math.max(...maxes);
  const points = daily.map((day, i) =>
    day.maxC === null ? null : { x: COL * i + COL / 2, y: scaleY(day.maxC, lo, hi, TOP, BOTTOM) },
  );
  const curve = smoothPath(points.filter((p): p is { x: number; y: number } => p !== null));

  return (
    <Glass labelledBy="proximos-dias">
      <h2 id="proximos-dias" className="text-base font-medium">
        Próximos dias
      </h2>

      {/* Leitores de tela recebem a lista em texto; a curva é só visual. */}
      <ul className="sr-only">
        {daily.map((day) => (
          <li key={day.date}>
            {formatDayLong(day.date)}: {describeWeatherCode(day.weatherCode).label}, mínima {formatTemp(day.minC)},
            máxima {formatTemp(day.maxC)}, chuva {formatMm(day.precipitationSumMm)} com chance de até{" "}
            {formatPct(day.precipitationProbMaxPct)}.
          </li>
        ))}
      </ul>

      <div
        role="region"
        aria-label="Gráfico dos próximos dias"
        tabIndex={0}
        className="-mx-5 mt-3 overflow-x-auto px-5 pb-1 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
      >
        <div aria-hidden="true" className="min-w-[36rem]">
          <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${daily.length}, 1fr)` }}>
            {daily.map((day) => (
              <div key={day.date}>
                <p className="text-sm text-white/90">{formatDayLabel(day.date, today)}</p>
                <p className="text-2xl font-light">{formatTemp(day.maxC)}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-1">
            <svg viewBox={`0 0 ${width} ${H}`} className="block h-24 w-full" preserveAspectRatio="none">
              <path d={curve} fill="none" stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </svg>
            {points.map((point, i) =>
              point === null ? null : (
                <span
                  key={daily[i].date}
                  className="absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 ring-1 ring-white/30"
                  style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / H) * 100}%` }}
                >
                  <WeatherIcon code={daily[i].weatherCode} isDay={true} className="size-5 text-white" />
                </span>
              ),
            )}
          </div>

          <div className="grid text-center text-sm" style={{ gridTemplateColumns: `repeat(${daily.length}, 1fr)` }}>
            {daily.map((day) => (
              <div key={day.date}>
                <p className="text-white/90">mín. {formatTemp(day.minC)}</p>
                <p className="text-white/90">{formatPct(day.precipitationProbMaxPct)} chuva</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/90">
        Linha: temperatura máxima de cada dia. Chuva: maior probabilidade horária do dia.
      </p>
    </Glass>
  );
}
