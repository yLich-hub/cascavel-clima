// Verifica o site publicado. Usado pelo workflow agendado `monitor.yml`:
// se este script sair com código 1, a execução falha e o GitHub avisa por e-mail.
//
// Uso: node scripts/check-health.mjs [url-base]

const DEFAULT_BASE = "https://cascavel-clima.vercel.app";
const PAGES = ["/", "/sobre", "/el-nino"];
const TIMEOUT_MS = 20_000;
const RETRY_DELAY_MS = 30_000;
// Dados do El Niño são buscados a cada 6 h; sem busca bem-sucedida há 48 h, o NOAA
// está fora do ar ou mudou o formato dos arquivos (o parser recusa e o site usa o último dado bom).
const ENSO_MAX_FETCH_AGE_H = 48;
const ENSO_PARTS = { weekly: "temperatura semanal", roni: "índice RONI", discussion: "boletim mensal" };

/**
 * Avalia o resultado das requisições. Função pura (testada em tests/check-health.test.ts).
 * `ensoStatus`/`enso` são opcionais: sem eles, os dados do El Niño não são avaliados.
 * @param {{ pages: Record<string, number>, apiStatus: number, api: any, ensoStatus?: number | string, enso?: any, now?: Date }} input
 * @returns {{ problems: string[], warnings: string[] }}
 */
export function evaluateHealth({ pages, apiStatus, api, ensoStatus, enso, now = new Date() }) {
  const problems = [];
  const warnings = [];

  for (const [path, status] of Object.entries(pages)) {
    if (status !== 200) problems.push(`Página ${path} respondeu HTTP ${status}`);
  }

  if (ensoStatus !== undefined) evaluateEnso({ ensoStatus, enso, now }, problems, warnings);

  if (apiStatus !== 200 || !api || typeof api !== "object") {
    problems.push(`/api/weather respondeu HTTP ${apiStatus}: previsão indisponível no site`);
    return { problems, warnings };
  }

  const forecast = api.freshness?.forecast?.status;
  const current = api.freshness?.current?.status;

  if (forecast === undefined || current === undefined) {
    problems.push("/api/weather respondeu sem informação de frescor (formato inesperado)");
  }
  if (forecast === "expired") {
    problems.push("Previsão expirada (mais de 24 h sem dado novo): o site não mostra previsão");
  } else if (forecast === "stale") {
    problems.push("Previsão com mais de 6 h: o provedor provavelmente está falhando");
  }
  if (current === "expired") {
    problems.push("Condições atuais expiradas (mais de 3 h): o card 'Agora' está vazio");
  } else if (current === "stale") {
    warnings.push("Condições atuais com mais de 30 min");
  }
  if (api.servedFrom === "fallback") {
    warnings.push("Servindo o último dado bom: o Open-Meteo falhou na última tentativa");
  }

  return { problems, warnings };
}

function evaluateEnso({ ensoStatus, enso, now }, problems, warnings) {
  if (ensoStatus !== 200 || !enso || typeof enso !== "object") {
    problems.push(`/api/enso respondeu HTTP ${ensoStatus}: dados do El Niño indisponíveis no site`);
    return;
  }
  for (const [key, label] of Object.entries(ENSO_PARTS)) {
    const part = enso[key];
    if (!part || typeof part !== "object") {
      problems.push(`/api/enso sem a parte "${key}" (formato inesperado)`);
    } else if (part.available === false && part.reason === "expired") {
      problems.push(`El Niño – ${label}: dado velho demais, não está sendo exibido (o NOAA parou de publicar?)`);
    } else if (part.available === false) {
      problems.push(`El Niño – ${label}: indisponível (NOAA falhou e não há dado anterior; o formato pode ter mudado)`);
    } else {
      if (part.freshness?.status === "stale") warnings.push(`El Niño – ${label}: publicação do NOAA atrasada`);
      const fetchedAt = Date.parse(part.report?.meta?.fetchedAt);
      const ageH = (now.getTime() - fetchedAt) / 3_600_000;
      if (Number.isNaN(fetchedAt) || ageH > ENSO_MAX_FETCH_AGE_H) {
        problems.push(
          `El Niño – ${label}: sem busca bem-sucedida há mais de ${ENSO_MAX_FETCH_AGE_H} h (NOAA fora do ar ou formato mudou)`,
        );
      } else if (part.servedFrom === "fallback") {
        warnings.push(`El Niño – ${label}: servindo o último dado bom (a última busca ao NOAA falhou)`);
      }
    }
  }
}

async function get(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": "cascavel-clima-monitor" },
  });
  return response;
}

async function collect(base) {
  const pages = {};
  for (const path of PAGES) {
    try {
      pages[path] = (await get(base + path)).status;
    } catch (error) {
      pages[path] = `erro de rede (${error.name})`;
    }
  }

  let apiStatus;
  let api = null;
  try {
    const response = await get(`${base}/api/weather`);
    apiStatus = response.status;
    if (response.ok) api = await response.json();
  } catch (error) {
    apiStatus = `erro de rede (${error.name})`;
  }

  let ensoStatus;
  let enso = null;
  try {
    const response = await get(`${base}/api/enso`);
    ensoStatus = response.status;
    if (response.ok) enso = await response.json();
  } catch (error) {
    ensoStatus = `erro de rede (${error.name})`;
  }
  return { pages, apiStatus, api, ensoStatus, enso };
}

async function main() {
  const base = (process.argv[2] ?? process.env.SITE_URL ?? DEFAULT_BASE).replace(/\/$/, "");

  let result = evaluateHealth(await collect(base));
  if (result.problems.length > 0) {
    // Uma nova tentativa evita alarme falso por instabilidade momentânea de rede.
    console.log(`Problemas na primeira verificação; repetindo em ${RETRY_DELAY_MS / 1000} s...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    result = evaluateHealth(await collect(base));
  }

  for (const warning of result.warnings) console.log(`AVISO: ${warning}`);
  if (result.problems.length > 0) {
    for (const problem of result.problems) console.error(`PROBLEMA: ${problem}`);
    process.exit(1);
  }
  console.log(`OK: ${base} funcionando normalmente.`);
}

// Só executa quando chamado direto (`node scripts/check-health.mjs`), não quando importado pelos testes.
if (process.argv[1]?.endsWith("check-health.mjs")) {
  await main();
}
