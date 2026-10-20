import { connection } from "next/server";
import { getEnsoView } from "@/lib/enso/get-enso";

/**
 * GET /api/enso — dados do El Niño do NOAA CPC (somente leitura): temperatura
 * semanal das regiões Niño, RONI trimestral e situação do boletim mensal.
 * Cada parte traz o próprio frescor; uma parte indisponível não derruba as outras.
 */
export async function GET() {
  await connection();
  const view = await getEnsoView(new Date());
  const anyAvailable = Object.values(view).some((part) => part.available);
  return Response.json(view, {
    status: anyAvailable ? 200 : 503,
    headers: {
      "cache-control": anyAvailable ? "public, max-age=0, s-maxage=300" : "no-store",
    },
  });
}
