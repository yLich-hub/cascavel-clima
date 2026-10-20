import reviewed from "@/content/el-nino-bulletin.json";
import { STATUS_TEXT } from "@/lib/enso/present";
import type { EnsoAlertStatus, EnsoDiscussion } from "@/types/enso";

/**
 * Boletim do NOAA em que os textos escritos à mão (src/content/el-nino.ts) se
 * baseiam. Ao revisar os textos, atualize src/content/el-nino-bulletin.json.
 */
export const REVIEWED_BULLETIN = reviewed as EnsoDiscussion;

/** O que mudou entre o boletim publicado agora e o usado nos textos. */
export type BulletinChange =
  | { kind: "none" }
  | { kind: "new-bulletin"; issuedOn: string; reviewedOn: string; statuses: string[] }
  | { kind: "status-changed"; issuedOn: string; reviewedOn: string; from: string[]; to: string[] };

const labels = (ids: EnsoAlertStatus[]) => ids.map((id) => STATUS_TEXT[id].label);
const sameStatuses = (a: EnsoAlertStatus[], b: EnsoAlertStatus[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Compara só fatos publicados (data e situação do boletim). Boletim igual ou
 * mais antigo que o revisado não gera aviso.
 */
export function compareBulletin(
  live: EnsoDiscussion,
  base: EnsoDiscussion = REVIEWED_BULLETIN,
): BulletinChange {
  if (live.issuedOn <= base.issuedOn) return { kind: "none" };
  const common = { issuedOn: live.issuedOn, reviewedOn: base.issuedOn };
  return sameStatuses(live.statuses, base.statuses)
    ? { kind: "new-bulletin", ...common, statuses: labels(live.statuses) }
    : { kind: "status-changed", ...common, from: labels(base.statuses), to: labels(live.statuses) };
}
