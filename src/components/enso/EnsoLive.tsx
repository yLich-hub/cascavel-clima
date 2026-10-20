import { connection } from "next/server";
import { ElNinoStory } from "@/components/enso/ElNinoStory";
import { EnsoLivePanel } from "@/components/enso/EnsoLivePanel";
import { OceanWarm } from "@/components/scene/OceanScene";
import { compareBulletin } from "@/lib/enso/bulletin";
import { getEnsoView } from "@/lib/enso/get-enso";
import { STATUS_TEXT, formatAnomaly, oceanWarmth } from "@/lib/enso/present";
import { formatDate } from "@/lib/format";

/** Dados do NOAA por requisição (o frescor depende de "agora"); vêm do cache do servidor. */
export async function EnsoLive() {
  await connection();
  return <EnsoLivePanel view={await getEnsoView(new Date())} />;
}

/** História "O que é" com o último passo vindo do dado semanal e da situação oficial do NOAA. */
export async function LiveStory() {
  await connection();
  const { weekly, discussion } = await getEnsoView(new Date());
  const last = weekly.available ? weekly.report.weeks.at(-1) : undefined;
  const statusLabel = discussion.available
    ? discussion.report.discussion.statuses.map((id) => STATUS_TEXT[id].label).join(" / ")
    : null;
  const live = last
    ? { valueText: formatAnomaly(last.regions.nino34.anomalyC), weekCenter: last.weekCenter, statusLabel }
    : null;
  return <ElNinoStory live={live} />;
}

/** "Mancha quente" da ilustração, proporcional ao valor semanal do Niño 3.4. */
export async function LiveOceanWarm() {
  await connection();
  const { weekly } = await getEnsoView(new Date());
  const value = weekly.available ? (weekly.report.weeks.at(-1)?.regions.nino34.anomalyC ?? null) : null;
  return <OceanWarm warmth={oceanWarmth(value)} />;
}

/** Resumo para a Início. Sem dado, não mostra nada (o link para a página continua). */
export async function EnsoStatusLine() {
  await connection();
  const { discussion, weekly } = await getEnsoView(new Date());
  const lines: string[] = [];
  if (discussion.available) {
    const { statuses, issuedOn } = discussion.report.discussion;
    const changed = compareBulletin(discussion.report.discussion).kind === "status-changed";
    lines.push(
      `Situação oficial do NOAA: ${statuses.map((id) => STATUS_TEXT[id].label).join(" / ")} (${changed ? "mudou no " : ""}boletim de ${formatDate(issuedOn)}).`,
    );
  }
  const last = weekly.available ? weekly.report.weeks.at(-1) : undefined;
  if (last) {
    lines.push(`Niño 3.4 na semana de ${formatDate(last.weekCenter)}: ${formatAnomaly(last.regions.nino34.anomalyC)} em relação à média.`);
  }
  if (lines.length === 0) return null;
  return (
    <span className="mt-2 block space-y-0.5 text-sm text-white">
      {lines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </span>
  );
}
