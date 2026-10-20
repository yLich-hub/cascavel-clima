import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Glass } from "@/components/home/Glass";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { AutoRefresh } from "@/components/layout/AutoRefresh";
import { SceneStage } from "@/components/scene/SceneStage";
import { AlertsBox } from "@/components/weather/AlertsBox";
import { WeatherUnavailable, WeatherSkeleton } from "@/components/weather/StatusMessages";
import { EnsoStatusLine } from "@/components/enso/EnsoLive";
import { CACHE_TTL_SECONDS, LOCATION } from "@/lib/config";
import { buildWeatherView, localDate } from "@/lib/weather/freshness";
import { getWeather } from "@/lib/weather/get-weather";
import { twilightAt, type Twilight } from "@/lib/weather/insights";
import { sceneFor } from "@/lib/weather/scenes";

export default function Home() {
  return (
    // Fundo escuro neutro enquanto a cena (que depende dos dados) não chega: nada de clarão branco.
    <div className="relative isolate flex-1 bg-gradient-to-b from-slate-800 to-slate-700">
      {/* Dados novos a cada 10 min com a aba aberta (mesmo intervalo do cache do servidor). */}
      <AutoRefresh everyMs={CACHE_TTL_SECONDS * 1000} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 lg:pt-10">
        <h1 className="sr-only">
          Previsão do tempo em {LOCATION.name} – {LOCATION.state}
        </h1>

        <Suspense fallback={<WeatherSkeleton />}>
          <Weather />
        </Suspense>

        {/* Fora do Suspense: estático, aparece mesmo se a previsão falhar. */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AlertsBox />
          <Glass labelledBy="el-nino-resumo" className="flex flex-col justify-center">
            <h2 id="el-nino-resumo" className="card-title">
              El Niño
            </h2>
            <p className="mt-1 text-sm text-white/90">
              Situação atualizada com dados do NOAA, o que é e o que se espera para o Paraná.
            </p>
            <Suspense fallback={null}>
              <EnsoStatusLine />
            </Suspense>
            <Link href="/el-nino" className="pill pill-light mt-4 self-start">
              Ver o El Niño ao vivo <span aria-hidden="true">→</span>
            </Link>
          </Glass>
        </div>
      </main>
    </div>
  );
}

async function Weather() {
  // Frescor depende de "agora": roda por requisição, sobre dados do cache do servidor.
  await connection();

  let result;
  try {
    result = await getWeather();
  } catch (error) {
    console.error("[home] previsão indisponível", error);
    return (
      <>
        <SceneBackdrop code={null} isDay={null} twilight={null} />
        <WeatherUnavailable />
      </>
    );
  }

  const now = new Date();
  const view = buildWeatherView(result, now);
  const today = view.daily.find((day) => day.date === localDate(now));
  const twilight = twilightAt(now, today?.sunrise ?? null, today?.sunset ?? null);
  return (
    <>
      {/* Sem dado atual (expirado), a cena fica neutra: não sugere uma condição que não sabemos. */}
      <SceneBackdrop code={view.current?.weatherCode ?? null} isDay={view.current?.isDay ?? null} twilight={twilight} />
      <HomeDashboard view={view} now={now} />
    </>
  );
}

function SceneBackdrop({ code, isDay, twilight }: { code: number | null; isDay: boolean | null; twilight: Twilight | null }) {
  return <SceneStage scene={sceneFor(code, isDay, twilight)} />;
}
