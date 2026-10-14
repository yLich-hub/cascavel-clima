import { connection } from "next/server";
import { OFFICIAL_ALERT_SOURCES } from "@/lib/config";
import { buildWeatherView } from "@/lib/weather/freshness";
import { getWeather } from "@/lib/weather/get-weather";

/**
 * GET /api/weather — previsão normalizada para Cascavel–PR (somente leitura).
 * Os dados vêm do cache do servidor; o frescor é calculado a cada requisição.
 */
export async function GET() {
  // Roda por requisição (não pré-renderiza no build): o frescor depende de "agora".
  await connection();

  try {
    const view = buildWeatherView(await getWeather(), new Date());
    return Response.json(view, {
      headers: {
        // CDN pode reaproveitar por 60 s; o dado em si já vem do cache de 10 min.
        "cache-control": "public, max-age=0, s-maxage=60",
      },
    });
  } catch (error) {
    console.error("[api/weather]", error);
    return Response.json(
      {
        error: "unavailable",
        message: "Não foi possível obter a previsão agora. Tente novamente em alguns minutos.",
        officialSources: OFFICIAL_ALERT_SOURCES,
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
