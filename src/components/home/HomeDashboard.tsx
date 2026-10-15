import { Glass } from "@/components/home/Glass";
import { Hero } from "@/components/home/Hero";
import { SunCard } from "@/components/home/SunCard";
import { UvCard } from "@/components/home/UvCard";
import { WeekCurve } from "@/components/home/WeekCurve";
import { WindCard } from "@/components/home/WindCard";
import { FreshnessBadge } from "@/components/weather/FreshnessBadge";
import { HourlyList } from "@/components/weather/HourlyList";
import { FallbackNotice, SourceNote } from "@/components/weather/StatusMessages";
import { localDate } from "@/lib/weather/freshness";
import type { WeatherView } from "@/types/weather";

/** Conteúdo da Início sobre a cena. Recebe a visão já filtrada por frescor. */
export function HomeDashboard({ view, now }: { view: WeatherView; now: Date }) {
  const today = localDate(now);
  const todayPoint = view.daily.find((day) => day.date === today);
  const tomorrowPoint = view.daily.find((day) => day.date > today);

  return (
    // minmax(0, …): sem isso a coluna cresce até o conteúdo mínimo da lista de horas
    // (centenas de px em linha) e arrasta todos os cards para fora da tela no celular.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      {view.servedFrom === "fallback" && (
        <div className="lg:col-span-2">
          <FallbackNotice fetchedAt={view.meta.fetchedAt} />
        </div>
      )}

      <Hero view={view} today={todayPoint} />

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
        <WindCard current={view.current} hourly={view.hourly} />
        <SunCard today={todayPoint} tomorrow={tomorrowPoint} now={now} />
        <UvCard uvIndexMax={todayPoint?.uvIndexMax ?? null} />
      </div>

      <div className="lg:col-span-2">
        <WeekCurve daily={view.daily} today={today} />
      </div>

      <HourlyList hourly={view.hourly} className="lg:col-span-2" />

      <Glass as="div" className="space-y-1 lg:col-span-2">
        <FreshnessBadge kind="forecast" prefix="Previsão obtida às" initial={view.freshness.forecast} />
        <SourceNote attribution={view.meta.attribution} />
      </Glass>
    </div>
  );
}
