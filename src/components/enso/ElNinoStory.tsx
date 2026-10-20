import type { ReactNode } from "react";
import { Glass } from "@/components/home/Glass";
import { CountUpText } from "@/components/motion/CountUp";
import { EL_NINO, SOURCES, type SourceId } from "@/content/el-nino";
import { STATUS_SOURCE_URL } from "@/lib/enso/present";
import { CPC_URLS } from "@/lib/enso/urls";
import { formatDate } from "@/lib/format";

/** Dado ao vivo do último passo; null enquanto carrega ou se o NOAA estiver fora do ar. */
export type StoryLive = { valueText: string; weekCenter: string; statusLabel: string | null } | null;

const PHASE = Object.fromEntries(EL_NINO.phases.map((phase) => [phase.name, phase.text]));

/**
 * "O que é", contado como cena: o palco fica preso na tela enquanto quatro
 * passos se sucedem e o mar ilustrado esfria e esquenta (globals.css, seção
 * "História do El Niño"). Com "reduzir movimento" ou sem suporte a animação
 * ligada à rolagem, os passos aparecem um embaixo do outro, todos legíveis.
 * O mar é ilustração; os números só aparecem no último passo, vindos do NOAA.
 */
export function ElNinoStory({ live }: { live: StoryLive }) {
  const steps: Array<{ kicker: string; title: string; body: ReactNode }> = [
    {
      kicker: "O que é",
      title: "Um oceano que mexe com o clima do planeta",
      body: (
        <>
          {EL_NINO.whatIs[0].text} <Citation id={EL_NINO.whatIs[0].source} />
        </>
      ),
    },
    {
      kicker: "La Niña",
      title: "Quando o Pacífico esfria",
      body: <>A fase La Niña acontece com {PHASE["La Niña"]}.</>,
    },
    {
      kicker: "El Niño",
      title: "Quando o Pacífico esquenta",
      body: (
        <>
          A fase El Niño acontece com {PHASE["El Niño"]}. O NOAA usa como referência +0,5 °C acima da
          média na região Niño 3.4, junto com outros critérios (Fonte:{" "}
          <a href={STATUS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            NOAA – ENSO Alert System
          </a>
          ).
        </>
      ),
    },
    {
      kicker: "Agora",
      title: "E como está o Pacífico agora?",
      body: live ? (
        <>
          <CountUpText text={live.valueText} className="block text-5xl font-bold tracking-tight sm:text-6xl" />
          <span className="mt-2 block">
            na região Niño 3.4, semana de {formatDate(live.weekCenter)}
            {live.statusLabel ? `. Situação oficial: ${live.statusLabel}` : ""} (Fonte:{" "}
            <a href={CPC_URLS.weekly} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              NOAA CPC
            </a>
            ).
          </span>
        </>
      ) : (
        <>Os números atualizados do NOAA estão em “Agora no Pacífico”, mais abaixo.</>
      ),
    },
  ];

  return (
    <section aria-labelledby="o-que-e" className="el-nino-story">
      <div className="story-stage">
        <div aria-hidden="true" className="story-sea">
          <div className="story-sea-cool" />
          <div className="story-sea-warm" />
          <div className="story-sea-shine" />
        </div>
        <ol className="story-steps">
          {steps.map((step, i) => (
            <li key={step.kicker} className="story-step" style={{ "--step": i } as React.CSSProperties}>
              <Glass as="div" className="p-6 sm:p-7">
                {i === 0 ? (
                  <h2 id="o-que-e" className="text-sm font-bold tracking-wide text-orange-300 uppercase">
                    {step.kicker}
                  </h2>
                ) : (
                  <p className="text-sm font-bold tracking-wide text-orange-300 uppercase">{step.kicker}</p>
                )}
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{step.title}</p>
                <div className="mt-3 text-base leading-relaxed">{step.body}</div>
              </Glass>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

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
