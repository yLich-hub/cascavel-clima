import "server-only";
import { cacheLife } from "next/cache";
import { CACHE_TTL_SECONDS } from "@/lib/config";
import { weatherService } from "@/lib/weather/service";
import type { WeatherResult } from "@/types/weather";

/**
 * Ponto de entrada usado pelas páginas e pelo /api/weather.
 *
 * Cache remoto ("use cache: remote"): no máximo uma chamada ao provedor a cada
 * 10 min, independentemente do número de visitantes. Se o serviço lançar erro,
 * nada é gravado no cache — uma falha nunca substitui o último dado bom.
 *
 * Por que remoto: o "use cache" comum guarda em memória, e na Vercel cada
 * requisição pode cair numa instância nova — verificado em 14/10/2026, cada
 * visita chamava o Open-Meteo. O remoto usa o Runtime Cache da Vercel,
 * compartilhado entre instâncias. Não sobrevive a um novo deploy (a primeira
 * visita depois de publicar busca dado novo).
 *
 * Não calcular frescor aqui: este resultado fica em cache, então "agora" seria
 * o momento da busca. O frescor é calculado por requisição (buildWeatherView).
 */
export async function getWeather(): Promise<WeatherResult> {
  "use cache: remote";
  cacheLife({
    stale: 60,
    revalidate: CACHE_TTL_SECONDS,
    expire: 24 * 60 * 60,
  });
  return weatherService.load();
}
