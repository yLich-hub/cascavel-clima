"use client";

import { useEffect, useRef, useState } from "react";

// Primeiro número do texto, com sinal opcional e decimais com vírgula: "+3,3 °C", "> 83%", "−0,8 °C".
const NUMBER = /([+−-]?)(\d+)(?:,(\d+))?/;

/** Divide o texto em antes, número e depois; null se não houver número. */
export function splitNumber(text: string) {
  const match = NUMBER.exec(text);
  if (!match) return null;
  const [whole, sign, int, dec = ""] = match;
  return {
    before: text.slice(0, match.index),
    sign,
    value: Number(`${int}.${dec || 0}`),
    digits: dec.length,
    after: text.slice(match.index + whole.length),
  };
}

/** Texto com o número trocado por `current`, mantendo sinal, casas decimais e o resto. */
export function withNumber(text: string, current: number): string {
  const parts = splitNumber(text);
  if (!parts) return text;
  const formatted = current.toLocaleString("pt-BR", {
    minimumFractionDigits: parts.digits,
    maximumFractionDigits: parts.digits,
  });
  return `${parts.before}${parts.sign}${formatted}${parts.after}`;
}

const DURATION_MS = 1300;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Número que conta a partir de zero quando entra na tela. O HTML do servidor
 * já traz o valor real (é o que aparece sem JavaScript, para buscadores e
 * leitores de tela); a contagem é só visual e não roda com "reduzir movimento".
 */
export function CountUpText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);

  useEffect(() => {
    const element = ref.current;
    const parts = splitNumber(text);
    if (!element || !parts || parts.value === 0) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          setShown(withNumber(text, parts.value * easeOut(t)));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {/* Leitores de tela leem só o valor final; a contagem fica escondida deles. */}
      <span aria-hidden="true" className="tabular-nums">
        {shown}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
