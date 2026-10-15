import { FreshnessBadge } from "@/components/weather/FreshnessBadge";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { Glass } from "@/components/home/Glass";
import { LOCATION } from "@/lib/config";
import { formatTemp } from "@/lib/format";
import { describeNow, uvCategory } from "@/lib/weather/insights";
import { describeWeatherCode } from "@/lib/weather/wmo-codes";
import type { DailyPoint, WeatherView } from "@/types/weather";

type Props = { view: WeatherView; today: DailyPoint | undefined; className?: string };

/** Destaque da Início: condição, temperatura, resumo em texto e selos. */
export function Hero({ view, today, className = "" }: Props) {
  const { current } = view;
  const uv = uvCategory(today?.uvIndexMax ?? null);

  return (
    <Glass className={`flex flex-col gap-5 p-6 sm:p-8 ${className}`} labelledBy="agora">
      <h2 id="agora" className="text-sm font-medium tracking-wide text-white/90">
        {LOCATION.name} – {LOCATION.state} · agora{" "}
        <span>(estimativa de modelo, não medição)</span>
      </h2>

      {current === null ? (
        <p className="text-base text-white">
          As condições atuais não estão disponíveis: os dados que temos têm mais de 3 horas e não
          representam o momento atual.
        </p>
      ) : (
        <>
          <div className="flex items-start gap-4">
            <WeatherIcon
              code={current.weatherCode}
              isDay={current.isDay}
              className="mt-1 size-12 shrink-0 text-white sm:size-14"
            />
            <p className="text-3xl font-light leading-tight tracking-tight sm:text-5xl">
              {describeWeatherCode(current.weatherCode).label}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <p className="text-7xl font-extralight leading-none tracking-tighter sm:text-8xl">
              {formatTemp(current.temperatureC)}
            </p>
            {today && (
              <p className="pb-2 text-base text-white/90">
                <span aria-hidden="true">↓ </span>
                <span className="sr-only">Mínima de hoje </span>
                {formatTemp(today.minC)}
                <span aria-hidden="true"> · ↑ </span>
                <span className="sr-only">, máxima de hoje </span>
                {formatTemp(today.maxC)}
              </p>
            )}
          </div>

          <p className="max-w-prose text-base leading-relaxed text-white">
            {describeNow(current, view.hourly)}
          </p>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="glass-inner rounded-full px-3 py-1 ring-1 ring-white/25">
          {LOCATION.name} – {LOCATION.state}
        </span>
        {uv && (
          <span className="glass-inner rounded-full px-3 py-1 ring-1 ring-white/25">
            UV máx. hoje: {uv.value} ({uv.level})
          </span>
        )}
      </div>

      <FreshnessBadge kind="current" prefix="Condições das" initial={view.freshness.current} />
    </Glass>
  );
}
