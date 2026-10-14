import { CurrentCard } from "@/components/weather/CurrentCard";
import { DailyList } from "@/components/weather/DailyList";
import { FreshnessBadge } from "@/components/weather/FreshnessBadge";
import { HourlyList } from "@/components/weather/HourlyList";
import { FallbackNotice, SourceNote } from "@/components/weather/StatusMessages";
import type { WeatherView } from "@/types/weather";

/** Tela de dados. Recebe a visão já filtrada por frescor (buildWeatherView). */
export function WeatherDashboard({ view, today }: { view: WeatherView; today: string }) {
  return (
    <div className="space-y-4">
      {view.servedFrom === "fallback" && <FallbackNotice fetchedAt={view.meta.fetchedAt} />}
      <CurrentCard current={view.current} freshness={view.freshness.current} />
      <HourlyList hourly={view.hourly} />
      <DailyList daily={view.daily} today={today} />
      <div className="space-y-1 px-1">
        <FreshnessBadge kind="forecast" prefix="Previsão obtida às" initial={view.freshness.forecast} />
        <SourceNote attribution={view.meta.attribution} />
      </div>
    </div>
  );
}
