import { ExternalLink, Siren } from "lucide-react";
import { OFFICIAL_ALERT_SOURCES } from "@/lib/config";

/**
 * Este site NÃO emite, resume nem verifica alertas. Nunca exibir "sem alertas":
 * não temos como garantir isso. Só apontamos para as fontes oficiais.
 */
export function AlertsBox() {
  return (
    <section
      aria-labelledby="alertas-oficiais"
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200"
    >
      <h2 id="alertas-oficiais" className="flex items-center gap-2 text-base font-semibold text-zinc-900">
        <Siren aria-hidden="true" className="size-5 text-red-600" />
        Alertas oficiais
      </h2>
      <p className="mt-2 text-sm text-zinc-700">
        Este site <strong>não emite alertas</strong> e não verifica se há alertas ativos para
        Cascavel. Para avisos de tempestade, vendaval, granizo ou chuva forte, consulte:
      </p>
      <ul className="mt-3 space-y-2">
        {OFFICIAL_ALERT_SOURCES.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm font-medium text-sky-800 ring-1 ring-zinc-200 hover:bg-sky-50"
            >
              {source.name}
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
