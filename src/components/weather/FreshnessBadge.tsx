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

const STYLES: Record<FreshnessStatus, { dot: string; text: string }> = {
  fresh: { dot: "bg-emerald-500", text: "text-zinc-600" },
  stale: { dot: "bg-amber-500", text: "text-amber-800" },
  expired: { dot: "bg-zinc-400", text: "text-zinc-700" },
};

const NOTE: Record<FreshnessStatus, string> = {
  fresh: "",
  stale: " — podem estar desatualizados",
  expired: " — expirados, recarregue a página",
};

export function FreshnessBadge({ kind, prefix, initial }: Props) {
  const [freshness, setFreshness] = useState(initial);

  useEffect(() => {
    const update = () =>
      setFreshness(classifyAge(initial.referenceTime, new Date(), FRESHNESS[kind]));
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [initial.referenceTime, kind]);

  const style = STYLES[freshness.status];
  const time =
    freshness.ageMinutes === null ? "horário desconhecido" : formatTime(freshness.referenceTime);

  return (
    <p className={`flex items-start gap-2 text-sm ${style.text}`} data-status={freshness.status}>
      <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${style.dot}`} />
      <span>
        {prefix} {time} ({formatAge(freshness.ageMinutes)}){NOTE[freshness.status]}
      </span>
    </p>
  );
}
