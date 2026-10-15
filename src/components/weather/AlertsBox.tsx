import { ExternalLink, Siren } from "lucide-react";
import { Glass } from "@/components/home/Glass";
import { OFFICIAL_ALERT_SOURCES } from "@/lib/config";

/**
 * Este site NÃO emite, resume nem verifica alertas. Nunca exibir "sem alertas":
 * não temos como garantir isso. Só apontamos para as fontes oficiais.
 */
export function AlertsBox({ className = "" }: { className?: string }) {
  return (
    <Glass labelledBy="alertas-oficiais" className={className}>
      <h2 id="alertas-oficiais" className="flex items-center gap-2 text-base font-medium">
        <Siren aria-hidden="true" className="size-5 text-red-300" />
        Alertas oficiais
      </h2>
      <p className="mt-2 text-sm text-white">
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
              className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-white underline-offset-2 ring-1 ring-white/15 hover:bg-white/20 hover:underline"
            >
              {source.name}
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </li>
        ))}
      </ul>
    </Glass>
  );
}
