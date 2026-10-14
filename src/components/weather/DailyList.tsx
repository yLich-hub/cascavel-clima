import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { formatDayLabel, formatDayLong, formatMm, formatPct, formatTemp } from "@/lib/format";
import { describeWeatherCode } from "@/lib/weather/wmo-codes";
import type { DailyPoint } from "@/types/weather";

type Props = { daily: DailyPoint[]; today: string };

export function DailyList({ daily, today }: Props) {
  return (
    <section aria-labelledby="proximos-dias" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <h2 id="proximos-dias" className="text-base font-semibold text-zinc-900">
        Próximos dias
      </h2>

      {daily.length === 0 ? (
        <p className="mt-3 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">
          Previsão diária indisponível no momento.
        </p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-zinc-100">
            {daily.map((day) => (
              <DayRow key={day.date} day={day} today={today} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-600">
            Chuva: total do dia inteiro (para hoje, inclui as horas que já passaram) e maior
            probabilidade horária do dia.
          </p>
        </>
      )}
    </section>
  );
}

function DayRow({ day, today }: { day: DailyPoint; today: string }) {
  const { label } = describeWeatherCode(day.weatherCode);
  return (
    <li className="grid grid-cols-[4.25rem_1.75rem_1fr_auto] items-center gap-2 py-2.5">
      <span className="text-sm font-medium text-zinc-900">
        <span aria-hidden="true">{formatDayLabel(day.date, today)}</span>
        <span className="sr-only">{formatDayLong(day.date)}</span>
      </span>
      <WeatherIcon code={day.weatherCode} isDay={true} className="size-6 text-sky-600" />
      <span className="min-w-0 text-xs leading-tight text-sky-700">
        <span className="sr-only">{label}. Chuva: </span>
        {formatMm(day.precipitationSumMm)}
        <span aria-hidden="true" className="text-zinc-400"> · </span>
        {formatPct(day.precipitationProbMaxPct)}
      </span>
      <span className="text-right text-sm tabular-nums">
        <span className="sr-only">mínima </span>
        <span className="text-zinc-600">{formatTemp(day.minC)}</span>
        <span aria-hidden="true" className="text-zinc-300"> / </span>
        <span className="sr-only">, máxima </span>
        <span className="font-semibold text-zinc-900">{formatTemp(day.maxC)}</span>
      </span>
    </li>
  );
}
