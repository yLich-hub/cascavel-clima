"use client";

import { useEffect, useState } from "react";
import { FRESHNESS } from "@/lib/config";
import { formatAge, formatTime } from "@/lib/format";
import { classifyAge } from "@/lib/weather/freshness";
import type { Freshness, FreshnessStatus } from "@/types/weather";

type Props = {
  kind: keyof typeof FRESHNESS;
  /** Texto antes do horário, ex.: "Condições das" ou "Previsão obtida às". */
  prefix: string;
  /** Calculado no servidor; o navegador recalcula a cada minuto se a aba ficar aberta. */
  initial: Freshness;
};

// Texto sempre branco sobre o vidro (contraste testado); o status vai no ponto e no texto.
const DOT: Record<FreshnessStatus, string> = {
  fresh: "bg-emerald-400",
  stale: "bg-amber-400",
  expired: "bg-zinc-300",
};

const NOTE: Record<FreshnessStatus, string> = {
  fresh: "",
  stale: " — podem estar desatualizados",
  expired: " — expirados, recarregue a página",
};

export function FreshnessBadge({ kind, prefix, initial }: Props) {
  const [freshness, setFreshness] = useState(initial);
  // Dado novo do servidor (atualização automática): recomeça a partir dele.
  const [shownReference, setShownReference] = useState(initial.referenceTime);
  if (initial.referenceTime !== shownReference) {
    setShownReference(initial.referenceTime);
    setFreshness(initial);
  }

  useEffect(() => {
    const update = () =>
      setFreshness(classifyAge(initial.referenceTime, new Date(), FRESHNESS[kind]));
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [initial.referenceTime, kind]);

  const time =
    freshness.ageMinutes === null ? "horário desconhecido" : formatTime(freshness.referenceTime);

  return (
    <p className="flex items-start gap-2 text-sm text-white/90" data-status={freshness.status}>
      <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[freshness.status]}`} />
      <span>
        {prefix} {time} ({formatAge(freshness.ageMinutes)}){NOTE[freshness.status]}
      </span>
    </p>
  );
}
