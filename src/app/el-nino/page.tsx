import { Info, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EL_NINO, SOURCES, isReviewOverdue, type SourceId, type Statement } from "@/content/el-nino";
import { formatDate } from "@/lib/format";
import { localDate } from "@/lib/weather/freshness";

export const metadata: Metadata = {
  title: "El Niño",
  description:
    "Contexto educativo sobre o El Niño e o que as fontes oficiais esperam para o Sul do Brasil e o Paraná.",
};

export default function ElNinoPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">El Niño: contexto climático</h1>
      <p className="mt-2 text-sm text-zinc-700">
        Esta página explica um padrão climático de grande escala, que muda probabilidades ao longo
        de meses. Ela <strong>não é previsão do tempo</strong>: para hoje e os próximos dias, veja a{" "}
        <Link href="/" className="text-sky-800 underline underline-offset-2">
          página inicial
        </Link>
        .
      </p>

      <div className="mt-4 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-950 ring-1 ring-sky-200">
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky-700" />
        <p>
          <strong>Um dia de chuva forte ou de calor em Cascavel não pode ser atribuído ao El Niño</strong>{" "}
          apenas com base nestas informações. O El Niño muda as chances de certos padrões ao longo
          de uma estação; atribuir um evento específico a ele exige estudo técnico próprio.
        </p>
      </div>

      <Suspense fallback={null}>
        <ReviewNotice />
      </Suspense>

      <Section id="o-que-e" title="O que é">
        <Statements items={EL_NINO.whatIs} />
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {EL_NINO.phases.map((phase) => (
            <li key={phase.name} className="rounded-xl bg-white p-3 text-sm shadow-sm ring-1 ring-zinc-200">
              <span className="font-semibold text-zinc-900">{phase.name}</span>
              <span className="block text-zinc-600">{phase.text}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="situacao" title="Situação atual">
        <p className="mb-3 font-medium text-zinc-900">{EL_NINO.status.headline}</p>
        <Statements items={EL_NINO.status.statements} />
      </Section>

      <Section id="sul-parana" title="O que as fontes esperam para o Sul e o Paraná">
        <Statements items={[...EL_NINO.south, ...EL_NINO.parana]} />
      </Section>

      <Section id="incertezas" title="Incertezas">
        <Statements items={EL_NINO.caveats} />
      </Section>

      <Section id="fontes-el-nino" title="Fontes">
        <ul className="space-y-2 text-sm">
          {Object.values(SOURCES).map((source) => (
            <li key={source.url} className="text-zinc-700">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-800 underline underline-offset-2">
                {source.title}
              </a>
              <span className="block text-xs text-zinc-600">
                {source.name}
                {source.publishedAt && ` · publicado em ${formatDate(source.publishedAt)}`}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-600">
          Conteúdo conferido nas fontes em {formatDate(EL_NINO.reviewedAt)}. Próximo boletim do NOAA
          previsto para {formatDate(EL_NINO.nextExpectedUpdate)}. Textos resumidos e traduzidos a
          partir das fontes.
        </p>
      </Section>
    </main>
  );
}

/** Calculado por requisição: avisa quando o conteúdo pode estar desatualizado. */
async function ReviewNotice() {
  await connection();
  if (!isReviewOverdue(localDate(new Date()))) return null;
  return (
    <div role="status" className="mt-4 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p>
        Este conteúdo foi conferido em {formatDate(EL_NINO.reviewedAt)} e pode estar desatualizado.
        Consulte as fontes abaixo para a situação mais recente.
      </p>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-lg font-semibold text-zinc-900">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Statements({ items }: { items: readonly Statement[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.text} className="text-sm text-zinc-800">
          {item.text} <Citation id={item.source} />
        </li>
      ))}
    </ul>
  );
}

function Citation({ id }: { id: SourceId }) {
  const source = SOURCES[id];
  return (
    <span className="whitespace-nowrap text-xs text-zinc-600">
      (Fonte:{" "}
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {source.short}
      </a>
      {source.publishedAt && `, ${formatDate(source.publishedAt)}`})
    </span>
  );
}
