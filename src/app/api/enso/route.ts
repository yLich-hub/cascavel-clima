import { connection } from "next/server";
import { REVIEWED_BULLETIN, compareBulletin } from "@/lib/enso/bulletin";
import { getEnsoView } from "@/lib/enso/get-enso";

/**
 * GET /api/enso — dados do El Niño do NOAA CPC (somente leitura): temperatura
 * semanal das regiões Niño, RONI trimestral e situação do boletim mensal.
 * Cada parte traz o próprio frescor; uma parte indisponível não derruba as outras.
 * `contentReview` diz se saiu boletim mais novo que o usado nos textos da página.
 */
export async function GET() {
  await connection();
  const view = await getEnsoView(new Date());
  const anyAvailable = Object.values(view).some((part) => part.available);
  // Comparação com o boletim usado nos textos da página (lida pelo workflow enso-boletim.yml).
  const contentReview = view.discussion.available
    ? { reviewedBulletin: REVIEWED_BULLETIN, change: compareBulletin(view.discussion.report.discussion) }
    : null;
  return Response.json({ ...view, contentReview }, {
    status: anyAvailable ? 200 : 503,
    headers: {
      "cache-control": anyAvailable ? "public, max-age=0, s-maxage=300" : "no-store",
    },
  });
}
