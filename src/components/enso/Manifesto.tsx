import { Glass } from "@/components/home/Glass";

/**
 * A frase mais importante da página, em tamanho de manifesto: acende palavra
 * por palavra conforme a rolagem (globals.css, ".manifesto-word"). O texto é
 * sempre o real e com cor cheia (gradiente recortado nas letras, não opacidade),
 * e sem suporte ou com "reduzir movimento" aparece todo aceso.
 */
const HIGHLIGHT = "Um dia de chuva forte ou de calor em Cascavel não pode ser atribuído ao El Niño";
const REST =
  "apenas com base nestas informações. O El Niño muda as chances de certos padrões ao longo de uma estação; atribuir um evento específico a ele exige estudo técnico próprio.";

/** Faixa da rolagem (em % do percurso da frase pela tela) em que cada palavra acende. */
export function wordRange(index: number, total: number): [number, number] {
  const start = 18 + (index / total) * 34;
  return [Math.round(start * 10) / 10, Math.round((start + 6) * 10) / 10];
}

export function Manifesto() {
  const words = HIGHLIGHT.split(" ");
  return (
    <Glass as="div" className="manifesto p-6 sm:p-10">
      <p className="text-[clamp(1.9rem,5.4vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
        {/* Leitores de tela recebem a frase inteira; as palavras separadas são só visuais. */}
        <span className="sr-only">{HIGHLIGHT}</span>
        <span aria-hidden="true">
          {words.map((word, i) => {
            const [from, to] = wordRange(i, words.length);
            return (
              <span
                key={i}
                className="manifesto-word"
                style={{ "--from": `${from}%`, "--to": `${to}%` } as React.CSSProperties}
              >
                {word}
                {i < words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </span>
      </p>
      <p className="mt-5 max-w-prose text-lg leading-relaxed text-white/90">{REST}</p>
    </Glass>
  );
}
