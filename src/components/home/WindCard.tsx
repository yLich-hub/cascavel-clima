import { Wind } from "lucide-react";
import { Glass } from "@/components/home/Glass";
import { formatHour, formatWindSpeed, windCardinal } from "@/lib/format";
import { scaleY, smoothPath } from "@/lib/svg";
import { windRange } from "@/lib/weather/insights";
import type { CurrentConditions, HourlyPoint } from "@/types/weather";

const W = 240;
const H = 64;

/** Vento agora + gráfico das próximas horas (barras e linha suave). */
export function WindCard({ current, hourly }: { current: CurrentConditions | null; hourly: HourlyPoint[] }) {
  const range = windRange(hourly);
  const max = range ? Math.max(range.max, 1) : 1;
  const step = hourly.length > 0 ? W / hourly.length : W;
  const points = hourly
    .map((point, i) =>
      point.windSpeedKmh === null ? null : { x: step * i + step / 2, y: scaleY(point.windSpeedKmh, 0, max, 6, H - 2) },
    )
    .filter((point): point is { x: number; y: number } => point !== null);

  return (
    <Glass labelledBy="vento">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="vento" className="flex items-center gap-2 text-sm font-medium text-white/90">
          <Wind aria-hidden="true" className="size-4" /> Vento
        </h2>
        {current && (
          <p className="text-2xl font-light">
            {formatWindSpeed(current.windSpeedKmh)}{" "}
            <span className="text-sm text-white/90">de {windCardinal(current.windDirectionDeg).short}</span>
          </p>
        )}
      </div>

      {range ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-16 w-full" aria-hidden="true" preserveAspectRatio="none">
            {hourly.map((point, i) =>
              point.windSpeedKmh === null ? null : (
                <rect
                  key={point.time}
                  x={step * i + step * 0.3}
                  width={step * 0.4}
                  y={scaleY(point.windSpeedKmh, 0, max, 6, H - 2)}
                  height={H - 2 - scaleY(point.windSpeedKmh, 0, max, 6, H - 2) + 1}
                  rx={1}
                  fill="rgb(255 255 255 / 0.35)"
                />
              ),
            )}
            <path d={smoothPath(points)} fill="none" stroke="white" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </svg>
          <p className="mt-2 text-sm text-white/90">
            Próximas {hourly.length} h: de {formatWindSpeed(range.min)} a {formatWindSpeed(range.max)}, pico às{" "}
            {formatHour(range.maxAt)}.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/90">Previsão de vento indisponível no momento.</p>
      )}
    </Glass>
  );
}
