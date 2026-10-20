import "server-only";
import { cacheLife } from "next/cache";
import { ENSO_CACHE_TTL_SECONDS } from "@/lib/config";
import { ensoServices } from "@/lib/enso/service";
import { buildEnsoView } from "@/lib/enso/view";
import type { EnsoView } from "@/types/enso";

/**
 * Pontos de entrada dos dados do El Niño. Mesmo esquema da previsão
 * (get-weather.ts): cache remoto compartilhado entre instâncias, no máximo uma
 * busca ao NOAA a cada 6 h por arquivo; erro nunca é gravado no cache.
 * O frescor é calculado por requisição, em getEnsoView.
 */
const ENSO_CACHE = { stale: 5 * 60, revalidate: ENSO_CACHE_TTL_SECONDS, expire: 7 * 24 * 60 * 60 };

export async function getEnsoWeekly() {
  "use cache: remote";
  cacheLife(ENSO_CACHE);
  return ensoServices.weekly.load();
}

export async function getEnsoRoni() {
  "use cache: remote";
  cacheLife(ENSO_CACHE);
  return ensoServices.roni.load();
}

export async function getEnsoDiscussion() {
  "use cache: remote";
  cacheLife(ENSO_CACHE);
  return ensoServices.discussion.load();
}

/** As três partes em paralelo; cada uma pode falhar sozinha. */
export async function getEnsoView(now: Date): Promise<EnsoView> {
  const [weekly, roni, discussion] = await Promise.allSettled([
    getEnsoWeekly(),
    getEnsoRoni(),
    getEnsoDiscussion(),
  ]);
  for (const result of [weekly, roni, discussion]) {
    if (result.status === "rejected") console.error("[enso]", result.reason);
  }
  return buildEnsoView({ weekly, roni, discussion }, now);
}
