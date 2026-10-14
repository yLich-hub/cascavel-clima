import "server-only";
import { cacheLife } from "next/cache";
import { CACHE_TTL_SECONDS } from "@/lib/config";
import { weatherService } from "@/lib/weather/service";
import type { WeatherResult } from "@/types/weather";

/**
 * Ponto de entrada usado pelas páginas e pelo /api/weather.
 *
 * Cache do Next ("use cache"): no máximo uma chamada ao provedor a cada 10 min,
 * independentemente do número de visitantes. Se o serviço lançar erro, nada é
 * gravado no cache — uma falha nunca substitui o último dado bom.
 *
 * Não calcular frescor aqui: este resultado fica em cache, então "agora" seria
 * o momento da busca. O frescor é calculado por requisição (buildWeatherView).
 */
export async function getWeather(): Promise<WeatherResult> {
  "use cache";
  cacheLife({
    stale: 60,
    revalidate: CACHE_TTL_SECONDS,
    expire: 24 * 60 * 60,
  });
  return weatherService.load();
}
