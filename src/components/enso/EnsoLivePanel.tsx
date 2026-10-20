import { Activity, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { AnomalyChart, type ChartPoint } from "@/components/enso/AnomalyChart";
import { CountUpText } from "@/components/motion/CountUp";
import {
  DIVERGING,
  NINO_REGIONS,
  RONI_SOURCE_URL,
  STATUS_SOURCE_URL,
  STATUS_TEXT,
  THRESHOLD_C,
  anomalyTone,
  formatAnomaly,
  formatSeason,
  toneColor,
} from "@/lib/enso/present";
import { CPC_URLS } from "@/lib/enso/urls";
import { formatDate, formatTime } from "@/lib/format";
import { localDate } from "@/lib/weather/freshness";
import type {
  DiscussionReport,
  EnsoPart,
  EnsoView,
  NinoRegionId,
  RoniReport,
  WeeklyNino,
  WeeklyNinoReport,
} from "@/types/enso";

/**
 * Painel "Agora no Pacífico": dados do NOAA exatamente como publicados, com a
 * data de cada um. Nenhuma frase aqui interpreta os números; os significados
 * vêm das definições do próprio NOAA (present.ts).
 */
export function EnsoLivePanel({ view }: { view: EnsoView }) {
  return (
    <div className="space-y-4">
      <p className="max-w-prose text-base leading-relaxed">
        Números do NOAA (agência de clima dos EUA), buscados automaticamente a cada 6 horas e
        mostrados como publicados. Cada bloco informa de quando é o dado.
      </p>
      <StatusBlock part={view.discussion} />
      <WeeklyBlock part={view.weekly} />
      <RegionsBlock part={view.weekly} />
      <RoniBlock part={view.roni} />
    </div>
  );
}

/** Esqueleto com a mesma estrutura, enquanto os dados chegam. */
export function EnsoLiveSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <span className="sr-only">Carregando dados do NOAA…</span>
      {[96, 260, 180, 260].map((height, i) => (
        <div key={i} aria-hidden="true" style={{ height }} className="glass-inner animate-pulse rounded-2xl ring-1 ring-white/20" />
      ))}
    </div>
  );
}

export const LIVE_SECTION = { id: "agora-pacifico", title: "Agora no Pacífico", icon: Activity };

// --- Situação oficial ----------------------------------------------------------

const TONE_BORDER = { warm: "border-[#e66767]", cool: "border-[#3987e5]", neutral: "border-slate-400" };

function StatusBlock({ part }: { part: EnsoPart<DiscussionReport> }) {
  if (!part.available) {
    return (
      <Block title="Situação oficial do NOAA">
        <p>
          Não foi possível obter a situação oficial agora. Consulte o{" "}
          <SourceLink href={CPC_URLS.discussion}>boletim do NOAA</SourceLink>.
        </p>
      </Block>
    );
  }

  const { discussion } = part.report;
  const statuses = discussion.statuses.map((id) => STATUS_TEXT[id]);
  return (
    <Block title="Situação oficial do NOAA" accent={TONE_BORDER[statuses[0].tone]}>
      {statuses.map((status) => (
        <div key={status.official} className="mt-1">
          <p className="text-2xl font-bold tracking-tight sm:text-3xl">{status.label}</p>
          <p className="mt-1 text-base">
            “{status.official}”: {status.meaning}.
          </p>
        </div>
      ))}
      <p className="mt-2 text-sm text-white/90">
        Boletim de {formatDate(discussion.issuedOn)} (Fonte:{" "}
        <SourceLink href={CPC_URLS.discussion}>NOAA CPC</SourceLink>). Significado das situações:{" "}
        <SourceLink href={STATUS_SOURCE_URL}>NOAA – ENSO Alert System</SourceLink>.
      </p>
      {part.freshness.status === "stale" && (
        <Note>O boletim mensal seguinte já deveria ter saído. Confira a situação na fonte.</Note>
      )}
      <Fetched part={part} />
    </Block>
  );
}

// --- Temperatura semanal ---------------------------------------------------------

function WeeklyBlock({ part }: { part: EnsoPart<WeeklyNinoReport> }) {
  if (!part.available) return <Unavailable title="Temperatura do mar na região Niño 3.4" href={CPC_URLS.weekly} />;

  const weeks = part.report.weeks;
  const last = weeks.at(-1) as WeeklyNino;
  const value = last.regions.nino34.anomalyC;
  const points: ChartPoint[] = weeks.map((week) => ({
    key: week.weekCenter,
    label: `semana de ${formatDate(week.weekCenter)}`,
    short: monthYear(week.weekCenter),
    value: week.regions.nino34.anomalyC,
  }));

  return (
    <Block title={`Temperatura do mar na região Niño 3.4 – semana de ${formatDate(last.weekCenter)}`}>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <CountUpText text={formatAnomaly(value)} className="text-5xl font-bold tracking-tight" />
        <span className="text-base">{relation(value)} de 1991–2020</span>
      </p>
      <Gauge value={value} />
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-white/90">
        O NOAA considera condições de El Niño quando essa diferença fica em +0,5 °C ou mais por um mês,
        junto com o índice de 3 meses (abaixo) e uma resposta típica da atmosfera. Um valor semanal
        sozinho não define o fenômeno (Fonte:{" "}
        <SourceLink href={STATUS_SOURCE_URL}>NOAA – ENSO Alert System</SourceLink>).
      </p>
      <h4 className="mt-5 text-base font-bold">Últimas {weeks.length} semanas</h4>
      <div className="mt-2">
        <AnomalyChart points={points} kind="line" digits={1} title="Diferença semanal na região Niño 3.4, em °C" />
      </div>
      <ValuesTable
        caption="Diferença semanal na região Niño 3.4"
        head="Semana (centro)"
        rows={points.map((p) => [formatDate(p.key), formatAnomaly(p.value)])}
      />
      <Fetched part={part} source={CPC_URLS.weekly} />
    </Block>
  );
}

/** Régua de −3 a +4 °C com a faixa neutra de ±0,5 °C e o valor atual. */
function Gauge({ value }: { value: number }) {
  const MIN = -3;
  const MAX = 4;
  const pos = (v: number) => ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 100;
  const zero = pos(0);
  const at = pos(value);
  const ticks = [-3, -2, -1, 0, 1, 2, 3, 4];
  return (
    <div aria-hidden="true" className="mt-4">
      <div className="relative h-4 rounded-full bg-white/15">
        <div
          className="absolute inset-y-0 bg-white/20"
          style={{ left: `${pos(-THRESHOLD_C)}%`, width: `${pos(THRESHOLD_C) - pos(-THRESHOLD_C)}%` }}
        />
        <div
          className="gauge-fill absolute inset-y-0 rounded-full"
          style={{
            left: `${Math.min(zero, at)}%`,
            width: `${Math.abs(at - zero)}%`,
            background: toneColor(anomalyTone(value)),
            transformOrigin: at >= zero ? "left" : "right",
          }}
        />
        <div className="absolute inset-y-[-4px] w-0.5 bg-white" style={{ left: `${zero}%` }} />
        <div
          className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950"
          style={{ left: `${at}%`, background: toneColor(anomalyTone(value)) }}
        />
      </div>
      <div className="relative mt-1 h-5 text-xs text-white/90">
        {ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pos(t)}%` }}>
            {t > 0 ? `+${t}` : t < 0 ? `−${-t}` : "0"}
          </span>
        ))}
      </div>
      {/* Três colunas iguais: no celular cada legenda quebra dentro da sua coluna, sem encostar na vizinha. */}
      <div className="grid grid-cols-3 gap-3 text-xs leading-snug text-white/90">
        <span>mais frio (La Niña)</span>
        <span className="text-center">faixa neutra ±0,5&nbsp;°C</span>
        <span className="text-right">mais quente (El Niño)</span>
      </div>
    </div>
  );
}

// --- Regiões -----------------------------------------------------------------------

const MAP_LON: [number, number] = [150, 290];
const REGION_ORDER: NinoRegionId[] = ["nino4", "nino34", "nino3", "nino12"];

function RegionsBlock({ part }: { part: EnsoPart<WeeklyNinoReport> }) {
  if (!part.available) return null;
  const last = part.report.weeks.at(-1) as WeeklyNino;
  const pos = (lon: number) => ((lon - MAP_LON[0]) / (MAP_LON[1] - MAP_LON[0])) * 100;

  return (
    <Block title={`As quatro regiões monitoradas – semana de ${formatDate(last.weekCenter)}`}>
      <p className="max-w-prose text-sm text-white/90">
        Faixas ao longo da linha do Equador, de oeste (Ásia/Oceania) para leste (América do Sul). A cor
        indica se a água está acima ou abaixo da média.
      </p>
      <ul className="mt-4 space-y-3">
        {REGION_ORDER.map((id) => {
          const region = NINO_REGIONS[id];
          const value = last.regions[id];
          return (
            <li key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)_5rem]">
              <p>
                <strong className="text-base">{region.name}</strong>
                <span className="block text-xs text-white/90">{region.where}</span>
              </p>
              <p className="text-right text-base font-bold sm:order-last">{formatAnomaly(value.anomalyC)}</p>
              <div className="relative col-span-2 h-3 rounded-full bg-white/10 sm:col-span-1" aria-hidden="true">
                <div
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${pos(region.lon[0])}%`,
                    width: `${pos(region.lon[1]) - pos(region.lon[0])}%`,
                    background: toneColor(anomalyTone(value.anomalyC)),
                  }}
                />
              </div>
              <span className="sr-only">
                Temperatura da água: {value.sstC.toLocaleString("pt-BR")} °C.
              </span>
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-white/90 sm:ml-[12.75rem] sm:mr-[5.75rem]">
        <span>150° L</span>
        <span>180°</span>
        <span>70° O · costa da América do Sul</span>
      </div>
      <Legend />
      <Fetched part={part} source={CPC_URLS.weekly} />
    </Block>
  );
}

// --- RONI --------------------------------------------------------------------------

function RoniBlock({ part }: { part: EnsoPart<RoniReport> }) {
  if (!part.available) return <Unavailable title="Índice oficial de 3 meses (RONI)" href={CPC_URLS.roni} />;

  const points: ChartPoint[] = part.report.points.map((point) => ({
    key: `${point.season}-${point.year}`,
    label: formatSeason(point),
    short: formatSeason(point).replace(/\/(\d{2})(\d{2})/g, "/$2"),
    value: point.anomalyC,
  }));
  const last = points.at(-1) as ChartPoint;

  return (
    <Block title="Índice oficial de 3 meses (RONI)">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <CountUpText text={formatAnomaly(last.value, 2)} className="text-4xl font-bold tracking-tight" />
        <span className="text-base">no trimestre {last.label}</span>
      </p>
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-white/90">
        Média de 3 meses da temperatura na região Niño 3.4, descontado o aquecimento médio de todo o
        oceano tropical. É o índice que o boletim do NOAA usa. Por ser uma média de 3 meses e por esse
        desconto, pode ficar bem diferente do valor semanal (Fonte:{" "}
        <SourceLink href={RONI_SOURCE_URL}>NOAA – RONI</SourceLink>).
      </p>
      <h4 className="mt-5 text-base font-bold">Últimos {points.length} trimestres</h4>
      <div className="mt-2">
        <AnomalyChart points={points} kind="bars" digits={2} title="Índice RONI por trimestre, em °C" />
      </div>
      <Legend />
      <ValuesTable caption="Índice RONI por trimestre" head="Trimestre" rows={points.map((p) => [p.label, formatAnomaly(p.value, 2)])} />
      <Fetched part={part} source={CPC_URLS.roni} />
    </Block>
  );
}

// --- Peças comuns ------------------------------------------------------------------

function Block({ title, accent = "border-white/30", children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <section className={`glass-inner rounded-2xl border-l-4 p-4 ring-1 ring-white/20 sm:p-5 ${accent}`}>
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Unavailable({ title, href }: { title: string; href: string }) {
  return (
    <Block title={title}>
      <p>
        Dado indisponível no momento. Consulte diretamente o <SourceLink href={href}>arquivo do NOAA</SourceLink>.
      </p>
    </Block>
  );
}

function Legend() {
  const items = [
    { color: DIVERGING.warm, text: "+0,5 °C ou mais (quente)" },
    { color: DIVERGING.neutral, text: "entre −0,5 e +0,5 °C" },
    { color: DIVERGING.cool, text: "−0,5 °C ou menos (frio)" },
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/90">
      {items.map((item) => (
        <li key={item.text} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-3 rounded-sm" style={{ background: item.color }} />
          {item.text}
        </li>
      ))}
    </ul>
  );
}

function ValuesTable({ caption, head, rows }: { caption: string; head: string; rows: string[][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer underline underline-offset-2">Ver todos os valores em tabela</summary>
      <div className="mt-2 max-h-72 overflow-y-auto rounded-xl ring-1 ring-white/20" tabIndex={0} role="region" aria-label={caption}>
        <table className="w-full text-left">
          <caption className="sr-only">{caption}, do mais recente para o mais antigo</caption>
          <thead>
            <tr>
              <th scope="col" className="px-3 py-1.5">{head}</th>
              <th scope="col" className="px-3 py-1.5 text-right">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map(([label, value]) => (
              <tr key={label} className="border-t border-white/10">
                <td className="px-3 py-1">{label}</td>
                <td className="px-3 py-1 text-right tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Rodapé de cada bloco: quando buscamos e se é o último dado bom. */
function Fetched({ part, source }: { part: EnsoPart<{ meta: { fetchedAt: string } }>; source?: string }) {
  if (!part.available) return null;
  const at = part.report.meta.fetchedAt;
  return (
    <p className="mt-3 text-xs text-white/90">
      {source && (
        <>
          Fonte: <SourceLink href={source}>NOAA CPC</SourceLink> (domínio público).{" "}
        </>
      )}
      Consultado em {formatDate(localDate(new Date(at)))} às {formatTime(at)}.
      {part.servedFrom === "fallback" && " A consulta mais recente falhou; este é o último dado obtido."}
      {part.freshness.status === "stale" && " A publicação seguinte do NOAA está atrasada."}
    </p>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 border-l-2 border-amber-300 pl-2 text-sm">{children}</p>;
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
      {children}
      <ExternalLink aria-hidden="true" className="ml-0.5 inline size-3 align-baseline" />
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

const relation = (value: number) => {
  const rounded = Number(value.toFixed(1));
  return rounded > 0 ? "acima da média" : rounded < 0 ? "abaixo da média" : "igual à média";
};

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function monthYear(date: string): string {
  const [year, month] = date.split("-");
  return `${MONTHS_SHORT[Number(month) - 1]}/${year.slice(2)}`;
}
