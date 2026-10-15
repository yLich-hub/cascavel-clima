import { Sunrise, Sunset } from "lucide-react";
import { Glass } from "@/components/home/Glass";
import { formatTime } from "@/lib/format";
import { sunProgress } from "@/lib/weather/insights";
import type { DailyPoint } from "@/types/weather";

const R = 88;
const CX = 100;
const CY = 100;

/** Arco do nascer ao pôr do sol com a posição atual. */
export function SunCard({ today, tomorrow, now }: { today?: DailyPoint; tomorrow?: DailyPoint; now: Date }) {
  const progress = sunProgress(now, today?.sunrise ?? null, today?.sunset ?? null);

  let status: string | null = null;
  if (progress?.state === "before" && today?.sunrise) status = `O sol nasce às ${formatTime(today.sunrise)}.`;
  if (progress?.state === "day" && today?.sunset) status = `Pôr do sol às ${formatTime(today.sunset)}.`;
  if (progress?.state === "after")
    status = tomorrow?.sunrise ? `O sol já se pôs. Nasce amanhã às ${formatTime(tomorrow.sunrise)}.` : "O sol já se pôs.";

  const angle = Math.PI * (progress?.fraction ?? 0);
  const sun = { x: CX - R * Math.cos(angle), y: CY - R * Math.sin(angle) };

  return (
    <Glass labelledBy="sol">
      <h2 id="sol" className="text-sm font-medium text-white/90">
        Sol hoje
      </h2>

      {progress && today?.sunrise && today.sunset ? (
        <>
          <svg viewBox="0 0 200 112" className="mt-2 w-full" aria-hidden="true">
            <path
              d={`M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY}`}
              fill="none"
              stroke="rgb(255 255 255 / 0.45)"
              strokeWidth={1.5}
              strokeDasharray="3 5"
            />
            <path
              d={`M${CX - R},${CY} A${R},${R} 0 0 1 ${CX + R},${CY}`}
              fill="none"
              stroke="rgb(253 230 138)"
              strokeWidth={2}
              pathLength={1}
              strokeDasharray={`${progress.fraction} 1`}
            />
            <line x1={4} x2={196} y1={CY} y2={CY} stroke="rgb(255 255 255 / 0.35)" strokeWidth={1} />
            {progress.state === "day" && (
              <>
                <circle cx={sun.x} cy={sun.y} r={11} fill="rgb(253 230 138 / 0.3)" />
                <circle cx={sun.x} cy={sun.y} r={5.5} fill="rgb(254 243 199)" />
              </>
            )}
          </svg>
          <div className="mt-1 flex justify-between text-sm">
            <p className="flex items-center gap-1.5">
              <Sunrise aria-hidden="true" className="size-4" />
              <span className="sr-only">Nascer do sol:</span> {formatTime(today.sunrise)}
            </p>
            <p className="flex items-center gap-1.5">
              <Sunset aria-hidden="true" className="size-4" />
              <span className="sr-only">Pôr do sol:</span> {formatTime(today.sunset)}
            </p>
          </div>
          {status && <p className="mt-2 text-sm text-white/90">{status}</p>}
        </>
      ) : (
        <p className="mt-3 text-sm text-white/90">Horários do sol indisponíveis no momento.</p>
      )}
    </Glass>
  );
}
