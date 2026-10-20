// Verifica se o NOAA publicou um boletim do El Niño mais novo que o usado nos
// textos da página e, se sim, abre uma issue no GitHub para revisar o conteúdo.
// Usado pelo workflow agendado `enso-boletim.yml` (o GitHub avisa o dono por e-mail).
//
// A comparação é feita pelo próprio site (GET /api/enso → contentReview), com o
// mesmo parser e a mesma regra da página. Falhas para obter os dados não abrem
// issue: o monitor (`check-health.mjs`) já cuida disso.
//
// Uso: GITHUB_TOKEN=... GITHUB_REPOSITORY=dono/repo node scripts/check-enso-bulletin.mjs [url-base]

const DEFAULT_BASE = "https://cascavel-clima.vercel.app";
const TIMEOUT_MS = 20_000;
const BULLETIN_URL = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml";
const PAINEL_URL = "https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias";

const brDate = (iso) => iso.split("-").reverse().join("/");
const quoted = (names) => names.map((name) => `“${name}”`).join(" e ");

/**
 * Decide se abre uma issue. Função pura (testada em tests/check-enso-bulletin.test.ts).
 * @param {any} contentReview campo `contentReview` de /api/enso
 * @returns {{ title: string, body: string } | null}
 */
export function planIssue(contentReview) {
  const change = contentReview?.change;
  if (!change || change.kind === "none") return null;

  const changed = change.kind === "status-changed";
  const title = `Novo boletim do NOAA de ${brDate(change.issuedOn)}: revisar a página El Niño`;
  const situation = changed
    ? `**A situação oficial mudou:** de ${quoted(change.from)} para ${quoted(change.to)}.`
    : `A situação oficial continua ${quoted(change.statuses)}.`;

  const body = [
    `O NOAA publicou o boletim de **${brDate(change.issuedOn)}**. Os textos da página El Niño foram escritos a partir do boletim de ${brDate(change.reviewedOn)}.`,
    "",
    situation,
    "",
    "Os números ao vivo (“Agora no Pacífico”) já se atualizam sozinhos e o site mostra um aviso no topo da página. Falta revisar os textos escritos à mão:",
    "",
    `- [ ] Ler o [boletim do NOAA](${BULLETIN_URL}) e o boletim mais recente do [Painel El Niño (INPE/INMET)](${PAINEL_URL})`,
    "- [ ] Atualizar `src/content/el-nino.ts`: textos, destaques, `publishedAt` das fontes, `reviewedAt` e `nextExpectedUpdate`",
    `- [ ] Atualizar \`src/content/el-nino-bulletin.json\` com a data (\`${change.issuedOn}\`) e a situação deste boletim — isso tira o aviso do site`,
    "- [ ] Rodar `npm test` e publicar",
    "",
    "_Aberta automaticamente pelo workflow `enso-boletim.yml`._",
  ].join("\n");

  return { title, body };
}

async function api(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "cascavel-clima-enso-boletim",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`GitHub ${init.method ?? "GET"} ${path}: HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const base = (process.argv[2] ?? process.env.SITE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const repo = process.env.GITHUB_REPOSITORY;

  let enso;
  try {
    const response = await fetch(`${base}/api/enso`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    enso = await response.json();
  } catch (error) {
    console.log(`Não foi possível consultar ${base}/api/enso (${error.message}); nada a fazer.`);
    return;
  }

  const plan = planIssue(enso.contentReview);
  if (!plan) {
    console.log("Nenhum boletim novo além do usado nos textos da página.");
    return;
  }
  console.log(plan.title);

  if (!repo || !process.env.GITHUB_TOKEN) {
    console.log("Sem GITHUB_TOKEN/GITHUB_REPOSITORY: issue não criada (execução local).");
    return;
  }

  // Uma issue por boletim: se já existe (aberta ou fechada), não repete.
  const issues = await api(`/repos/${repo}/issues?state=all&per_page=100`);
  if (issues.some((issue) => issue.title === plan.title)) {
    console.log("Issue deste boletim já existe; nada a fazer.");
    return;
  }
  const created = await api(`/repos/${repo}/issues`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // A menção garante a notificação por e-mail mesmo sem "watch" no repositório.
    body: JSON.stringify({ ...plan, body: `${plan.body}

cc @${repo.split("/")[0]}` }),
  });
  console.log(`Issue criada: ${created.html_url}`);
}

if (process.argv[1]?.endsWith("check-enso-bulletin.mjs")) {
  await main();
}
