import { ENSO_FRESHNESS_DAYS } from "@/lib/config";
import { classifyAge } from "@/lib/weather/freshness";
import type { Loaded } from "@/lib/sources/resilient-source";
import type {
  DiscussionReport,
  EnsoPart,
  EnsoView,
  RoniPoint,
  RoniReport,
  WeeklyNinoReport,
} from "@/types/enso";

const DAY_MIN = 24 * 60;
const toMinutes = ({ staleAfter, expiredAfter }: { staleAfter: number; expiredAfter: number }) => ({
  staleAfterMin: staleAfter * DAY_MIN,
  expiredAfterMin: expiredAfter * DAY_MIN,
});

/** Último dia do trimestre do RONI (o mês seguinte ao central), ao meio-dia UTC. */
export function seasonEnd({ centerMonth }: Pick<RoniPoint, "centerMonth">): string {
  const [year, month] = centerMonth.split("-").map(Number);
  // Dia 0 do mês M+2 (base 0) = último dia do mês M+1 (base 1). Date.UTC ajusta a virada de ano.
  return new Date(Date.UTC(year, month + 1, 0, 12)).toISOString();
}

/** Data de referência de cada parte: a do próprio dado, não a da busca. */
export const referenceTime = {
  weekly: (report: WeeklyNinoReport) => `${report.weeks.at(-1)?.weekCenter}T12:00:00Z`,
  roni: (report: RoniReport) => {
    const last = report.points.at(-1);
    return last ? seasonEnd(last) : "";
  },
  discussion: (report: DiscussionReport) => `${report.discussion.issuedOn}T12:00:00Z`,
};

function part<T>(
  settled: PromiseSettledResult<Loaded<T>>,
  reference: (report: T) => string,
  rule: { staleAfter: number; expiredAfter: number },
  now: Date,
): EnsoPart<T> {
  if (settled.status === "rejected") return { available: false, reason: "unavailable" };
  const { report, servedFrom, failure } = settled.value;
  const freshness = classifyAge(reference(report), now, toMinutes(rule));
  if (freshness.status === "expired") return { available: false, reason: "expired", freshness };
  return { available: true, report, servedFrom, ...(failure && { failure }), freshness };
}

/**
 * Monta o que pode ser exibido agora. Cada parte é independente: o boletim
 * pode estar indisponível enquanto o dado semanal está ok, e vice-versa.
 */
export function buildEnsoView(
  settled: {
    weekly: PromiseSettledResult<Loaded<WeeklyNinoReport>>;
    roni: PromiseSettledResult<Loaded<RoniReport>>;
    discussion: PromiseSettledResult<Loaded<DiscussionReport>>;
  },
  now: Date,
): EnsoView {
  return {
    weekly: part(settled.weekly, referenceTime.weekly, ENSO_FRESHNESS_DAYS.weekly, now),
    roni: part(settled.roni, referenceTime.roni, ENSO_FRESHNESS_DAYS.roni, now),
    discussion: part(settled.discussion, referenceTime.discussion, ENSO_FRESHNESS_DAYS.discussion, now),
  };
}
