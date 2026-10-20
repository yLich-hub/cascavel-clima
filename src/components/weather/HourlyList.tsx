import { Droplets } from "lucide-react";
import { Glass } from "@/components/home/Glass";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { formatHour, formatPct, formatTemp } from "@/lib/format";
import { describeWeatherCode } from "@/lib/weather/wmo-codes";
import type { HourlyPoint } from "@/types/weather";

export function HourlyList({ hourly, className = "" }: { hourly: HourlyPoint[]; className?: string }) {
  return (
    <Glass labelledBy="proximas-horas" className={className}>
      <h2 id="proximas-horas" className="card-title">
        Próximas horas
      </h2>

      {hourly.length === 0 ? (
        <p className="mt-3 text-sm text-white/90">Previsão por hora indisponível no momento.</p>
      ) : (
        <>
          {/* Região rolável focável: sem tabIndex, quem usa só teclado não consegue rolar a lista. */}
          <div
            role="region"
            aria-labelledby="proximas-horas"
            tabIndex={0}
            className="-mx-5 mt-2 overflow-x-auto px-5 pt-1 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
          >
            <ol className="flex snap-x gap-2">
              {hourly.map((point) => (
                <HourItem key={point.time} point={point} />
              ))}
            </ol>
          </div>
          <p className="mt-1 text-sm text-white/90">
            Chance de chuva: probabilidade de mais de 0,1 mm na hora que termina no horário indicado.
          </p>
        </>
      )}
    </Glass>
  );
}

function HourItem({ point }: { point: HourlyPoint }) {
  const { label } = describeWeatherCode(point.weatherCode);
  return (
    // `relative` prende os textos sr-only (position: absolute) dentro da lista rolável;
    // sem isso eles se ancoram no documento e criam rolagem horizontal na página.
    <li className="relative flex w-16 shrink-0 snap-start flex-col items-center gap-1 glass-inner rounded-2xl px-1 py-3 text-center ring-1 ring-white/20">
      <span className="text-sm text-white/90">{formatHour(point.time)}</span>
      <WeatherIcon code={point.weatherCode} isDay={point.isDay} className="size-7 text-white" />
      <span className="sr-only">{label}</span>
      <span className="card-title">{formatTemp(point.temperatureC)}</span>
      <span className="flex items-center gap-0.5 text-xs text-white">
        <Droplets aria-hidden="true" className="size-3" />
        <span className="sr-only">chance de chuva</span>
        {formatPct(point.precipitationProbPct)}
      </span>
    </li>
  );
}
