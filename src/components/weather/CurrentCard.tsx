import { Droplets, Thermometer, Umbrella, Wind } from "lucide-react";
import { FreshnessBadge } from "@/components/weather/FreshnessBadge";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { formatMm, formatPct, formatTemp, formatWindSpeed, windCardinal } from "@/lib/format";
import { describeWeatherCode } from "@/lib/weather/wmo-codes";
import type { CurrentConditions, Freshness } from "@/types/weather";

type Props = { current: CurrentConditions | null; freshness: Freshness };

export function CurrentCard({ current, freshness }: Props) {
  return (
    <section aria-labelledby="agora" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="agora" className="text-base font-semibold text-zinc-900">
          Agora
        </h2>
        <span className="text-xs text-zinc-600">estimativa de modelo, não medição</span>
      </div>

      {current === null ? (
        <p className="mt-4 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700">
          As condições atuais não estão disponíveis: os dados que temos têm mais de 3 horas e não
          representam o momento atual.
        </p>
      ) : (
        <CurrentValues current={current} />
      )}

      <div className="mt-4">
        <FreshnessBadge kind="current" prefix="Condições das" initial={freshness} />
      </div>
    </section>
  );
}

function CurrentValues({ current }: { current: CurrentConditions }) {
  const { label } = describeWeatherCode(current.weatherCode);
  const wind = windCardinal(current.windDirectionDeg);

  return (
    <>
      <div className="mt-3 flex items-center gap-4">
        <WeatherIcon
          code={current.weatherCode}
          isDay={current.isDay}
          className="size-16 shrink-0 text-sky-600"
        />
        <div>
          <p className="text-6xl font-semibold leading-none tracking-tight text-zinc-900">
            {formatTemp(current.temperatureC)}
          </p>
          <p className="mt-1 text-base text-zinc-700">{label}</p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Detail icon={Thermometer} term="Sensação térmica" value={formatTemp(current.apparentTemperatureC)} />
        <Detail icon={Droplets} term="Umidade" value={formatPct(current.humidityPct)} />
        <Detail
          icon={Wind}
          term="Vento"
          value={
            <>
              {formatWindSpeed(current.windSpeedKmh)}{" "}
              <abbr title={`soprando do ${wind.long}`} className="no-underline">
                de {wind.short}
              </abbr>
            </>
          }
        />
        <Detail icon={Umbrella} term="Chuva (últimos 15 min)" value={formatMm(current.precipitationMm)} />
      </dl>
    </>
  );
}

function Detail({
  icon: Icon,
  term,
  value,
}: {
  icon: typeof Wind;
  term: string;
  value: React.ReactNode;
}) {
  return (
    // Dentro de <dl>, cada <div> pode conter só <dt>/<dd>: o ícone fica dentro do <dt>.
    <div className="rounded-lg bg-zinc-50 p-2.5">
      <dt className="flex items-start gap-1.5 text-xs text-zinc-600">
        <Icon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        {term}
      </dt>
      <dd className="mt-0.5 font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
