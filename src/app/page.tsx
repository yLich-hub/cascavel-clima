import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertsBox } from "@/components/weather/AlertsBox";
import { WeatherUnavailable, WeatherSkeleton } from "@/components/weather/StatusMessages";
import { WeatherDashboard } from "@/components/weather/WeatherDashboard";
import { LOCATION } from "@/lib/config";
import { buildWeatherView, localDate } from "@/lib/weather/freshness";
import { getWeather } from "@/lib/weather/get-weather";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-6">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {LOCATION.name} – {LOCATION.state}
        </h1>
        <p className="text-sm text-zinc-600">Previsão do tempo</p>
      </header>

      <Suspense fallback={<WeatherSkeleton />}>
        <Weather />
      </Suspense>

      {/* Fora do Suspense: estático, aparece mesmo se a previsão falhar. */}
      <div className="mt-4">
        <AlertsBox />
      </div>

      <Link
        href="/el-nino"
        className="mt-4 block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 hover:bg-sky-50"
      >
        <span className="text-base font-semibold text-zinc-900">El Niño: contexto climático →</span>
        <span className="mt-1 block text-sm text-zinc-600">
          O que é, a situação atual segundo as fontes oficiais e o que se espera para o Paraná.
        </span>
      </Link>
    </main>
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
    return <WeatherUnavailable />;
  }

  const now = new Date();
  return <WeatherDashboard view={buildWeatherView(result, now)} today={localDate(now)} />;
}
