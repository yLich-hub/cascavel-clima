import {
  BookOpen,
  CloudRain,
  MapPin,
  Thermometer,
  TriangleAlert,
  Waves,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { BulletinNotice } from "@/components/enso/BulletinNotice";
import { ElNinoStory } from "@/components/enso/ElNinoStory";
import { EnsoLive, LiveOceanWarm, LiveStory } from "@/components/enso/EnsoLive";
import { EnsoLiveSkeleton, LIVE_SECTION } from "@/components/enso/EnsoLivePanel";
import { Manifesto } from "@/components/enso/Manifesto";
import { Glass } from "@/components/home/Glass";
import { AutoRefresh } from "@/components/layout/AutoRefresh";
import { CountUpText } from "@/components/motion/CountUp";
import { OceanScene, OceanWarm } from "@/components/scene/OceanScene";
import { EL_NINO, SOURCES, isReviewOverdue, type SourceId, type Statement } from "@/content/el-nino";
import { compareBulletin } from "@/lib/enso/bulletin";
import { getEnsoView } from "@/lib/enso/get-enso";
import { formatDate } from "@/lib/format";
import { localDate } from "@/lib/weather/freshness";

export const metadata: Metadata = {
  title: "El Niño",
  description:
    "Situação do El Niño atualizada automaticamente com dados do NOAA, contexto educativo e o que as fontes oficiais esperam para o Sul do Brasil e o Paraná.",
};

export default function ElNinoPage() {
  return (
    <div className="relative isolate flex-1 bg-slate-950">
      <div className="fixed inset-0 -z-10">
        {/* A mancha quente cresce conforme o dado semanal; até ele chegar, não aparece. */}
        <OceanScene
          warm={
            <Suspense fallback={<OceanWarm warmth={0} />}>
              <LiveOceanWarm />
            </Suspense>
          }
        />
      </div>

      {/* Dados do NOAA mudam devagar (cache de 6 h); com a aba aberta, confere a cada 30 min. */}
      <AutoRefresh everyMs={30 * 60 * 1000} />
      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-12 pt-8 lg:pt-12">
        <Glass as="div" className="enter-up relative overflow-hidden p-6 sm:p-8">
          <span aria-hidden="true" className="enter-sweep" />
          <p className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Waves aria-hidden="true" className="size-4 text-orange-300" /> Contexto climático
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">El Niño: contexto climático</h1>
          <p className="mt-3 max-w-prose text-base leading-relaxed">
            Esta página explica um padrão climático de grande escala, que muda probabilidades ao longo
            de meses. Ela <strong>não é previsão do tempo</strong>: para hoje e os próximos dias, veja a{" "}
            <Link href="/" className="font-medium underline underline-offset-2">
              página inicial
            </Link>
            .
          </p>

        </Glass>

        <Suspense fallback={null}>
          <ContentNotice />
        </Suspense>

        {/* "O que é" contado como cena; o último passo usa o dado semanal do NOAA. */}
        <Suspense fallback={<ElNinoStory live={null} />}>
          <LiveStory />
        </Suspense>

        <Manifesto />

        <Section id={LIVE_SECTION.id} title={LIVE_SECTION.title} icon={LIVE_SECTION.icon}>
          <Suspense fallback={<EnsoLiveSkeleton />}>
            <EnsoLive />
          </Suspense>
        </Section>

        <Section id="situacao" title="O que dizem os boletins" icon={Thermometer}>
          <p className="text-sm text-white/90">
            Resumo feito à mão a partir dos boletins, conferido em {formatDate(EL_NINO.reviewedAt)}. Os
            números ao vivo estão em “{LIVE_SECTION.title}”, acima.
          </p>
          <p className="mt-2 text-lg font-bold">{EL_NINO.status.headline}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EL_NINO.highlights.map((item) => (
              <li
                key={item.label}
                className="glass-inner rounded-2xl border-l-4 border-orange-400 p-4 ring-1 ring-white/20"
              >
                <p className="text-3xl font-bold tracking-tight">
                  <CountUpText text={item.value} />
                </p>
                <p className="mt-1 text-sm">{item.label}</p>
                <p className="mt-2 text-sm text-white/90">
                  <Citation id={item.source} />
                </p>
              </li>
            ))}
          </ul>
          <Statements items={EL_NINO.status.statements} className="mt-5" />
        </Section>

        <Section id="sul-parana" title="O que as fontes esperam para o Sul e o Paraná" icon={MapPin}>
          <Statements items={EL_NINO.south} icon={CloudRain} />
          <Statements items={EL_NINO.parana} icon={MapPin} className="mt-3" />
        </Section>

        <Section id="incertezas" title="Incertezas" icon={TriangleAlert} iconColor="text-amber-300">
          <Statements items={EL_NINO.caveats} icon={TriangleAlert} accent="border-amber-300" />
        </Section>

        <Section id="fontes-el-nino" title="Fontes" icon={BookOpen}>
          <ul className="space-y-3 text-sm">
            {Object.values(SOURCES).map((source) => (
              <li key={source.url} className="glass-inner rounded-2xl p-4 ring-1 ring-white/20">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-bold underline underline-offset-2">
                  {source.title}
                </a>
                <span className="mt-1 block text-white/90">
                  {source.name}
                  {source.publishedAt && ` · publicado em ${formatDate(source.publishedAt)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-white/90">
            Conteúdo conferido nas fontes em {formatDate(EL_NINO.reviewedAt)}. Próximo boletim do NOAA
            previsto para {formatDate(EL_NINO.nextExpectedUpdate)}. Textos resumidos e traduzidos a
            partir das fontes. O oceano ao fundo é uma ilustração; só o tamanho da mancha quente acompanha o
            valor semanal da região Niño 3.4 (quanto mais quente, maior, até +3 °C).
          </p>
        </Section>
      </main>
    </div>
  );
}

/**
 * Calculado por requisição. Prioridade: boletim novo do NOAA (com ou sem
 * mudança de situação) > prazo de revisão vencido > nada.
 */
async function ContentNotice() {
  await connection();
  const { discussion } = await getEnsoView(new Date());
  if (discussion.available) {
    const change = compareBulletin(discussion.report.discussion);
    if (change.kind !== "none") return <BulletinNotice change={change} />;
  }
  if (!isReviewOverdue(localDate(new Date()))) return null;
  return (
    <Glass as="div" className="ring-amber-300/60">
      <Callout icon={TriangleAlert} accent="border-amber-300" iconColor="text-amber-300">
        Este conteúdo foi conferido em {formatDate(EL_NINO.reviewedAt)} e pode estar desatualizado.
        Consulte as fontes abaixo para a situação mais recente.
      </Callout>
    </Glass>
  );
}

function Section({
  id,
  title,
  icon: Icon,
  iconColor = "text-orange-300",
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: ReactNode;
}) {
  return (
    <Glass labelledBy={id} className="reveal p-6 sm:p-7">
      <h2 id={id} className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
        <Icon aria-hidden="true" className={`size-6 shrink-0 ${iconColor}`} />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Glass>
  );
}

/** "Balão" de destaque: fundo do card um pouco mais escuro e faixa colorida à esquerda. */
function Callout({
  icon: Icon,
  accent,
  iconColor,
  className = "",
  children,
}: {
  icon: LucideIcon;
  accent: string;
  iconColor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`glass-inner flex gap-3 rounded-2xl border-l-4 p-4 text-base ring-1 ring-white/20 ${accent} ${className}`}>
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${iconColor}`} />
      <p>{children}</p>
    </div>
  );
}

function Statements({
  items,
  icon: Icon,
  accent = "border-orange-400/80",
  className = "",
}: {
  items: readonly Statement[];
  icon?: LucideIcon;
  accent?: string;
  className?: string;
}) {
  return (
    <ul className={`space-y-3 ${className}`}>
      {items.map((item) => (
        <li key={item.text} className={`glass-inner flex gap-3 rounded-2xl border-l-4 p-4 ring-1 ring-white/20 ${accent}`}>
          {Icon && <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-white/90" />}
          <p className="text-base leading-relaxed">
            {item.text} <Citation id={item.source} />
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Pode quebrar linha: citações longas sem quebra transbordavam a tela do celular. */
function Citation({ id }: { id: SourceId }) {
  const source = SOURCES[id];
  return (
    <span className="text-sm text-white/90">
      (Fonte:{" "}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {source.short}
      </a>
      {source.publishedAt && `, ${formatDate(source.publishedAt)}`})
    </span>
  );
}
