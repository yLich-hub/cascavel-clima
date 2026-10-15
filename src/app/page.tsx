import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Glass } from "@/components/home/Glass";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { WeatherScene } from "@/components/scene/WeatherScene";
import { AlertsBox } from "@/components/weather/AlertsBox";
import { WeatherUnavailable, WeatherSkeleton } from "@/components/weather/StatusMessages";
import { LOCATION } from "@/lib/config";
import { buildWeatherView } from "@/lib/weather/freshness";
import { getWeather } from "@/lib/weather/get-weather";
import { sceneFor } from "@/lib/weather/scenes";

export default function Home() {
  return (
    // `home-scene`: ativa o cabeçalho/rodapé de vidro (globals.css). Fundo escuro
    // neutro enquanto a cena (que depende dos dados) não chega: nada de clarão branco.
    <div className="home-scene relative isolate flex-1 bg-gradient-to-b from-slate-800 to-slate-700">
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
          <Glass as="div" className="flex flex-col justify-center">
            <Link href="/el-nino" className="group block">
              <span className="text-base font-medium group-hover:underline">El Niño: contexto climático →</span>
              <span className="mt-1 block text-sm text-white/90">
                O que é, a situação atual segundo as fontes oficiais e o que se espera para o Paraná.
              </span>
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
        <SceneBackdrop code={null} isDay={null} />
        <WeatherUnavailable />
      </>
    );
  }

  const now = new Date();
  const view = buildWeatherView(result, now);
  return (
    <>
      {/* Sem dado atual (expirado), a cena fica neutra: não sugere uma condição que não sabemos. */}
      <SceneBackdrop code={view.current?.weatherCode ?? null} isDay={view.current?.isDay ?? null} />
      <HomeDashboard view={view} now={now} />
    </>
  );
}

function SceneBackdrop({ code, isDay }: { code: number | null; isDay: boolean | null }) {
  return (
    <div className="fixed inset-0 -z-10">
      <WeatherScene scene={sceneFor(code, isDay)} />
    </div>
  );
}
