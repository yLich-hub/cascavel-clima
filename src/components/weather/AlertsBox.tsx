import { ExternalLink, Phone, Siren } from "lucide-react";
import { Glass } from "@/components/home/Glass";
import { EMERGENCY_PHONES, OFFICIAL_ALERT_SOURCES } from "@/lib/config";

/**
 * Este site NÃO emite, resume nem verifica alertas. Nunca exibir "sem alertas":
 * não temos como garantir isso. Só apontamos para as fontes oficiais.
 */
export function AlertsBox({ className = "" }: { className?: string }) {
  return (
    <Glass labelledBy="alertas-oficiais" className={className}>
      <h2 id="alertas-oficiais" className="card-title flex items-center gap-2">
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
              className="pill pill-glass w-full justify-between px-4 text-left text-sm"
            >
              {source.name}
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-white">
        <strong>Em situação de emergência, ligue:</strong>
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {EMERGENCY_PHONES.map((phone) => (
          <li key={phone.number}>
            <a
              href={`tel:${phone.number}`}
              className="pill pill-glass w-full justify-start px-4 text-sm"
            >
              <Phone aria-hidden="true" className="size-4 shrink-0 text-red-300" />
              <span>
                <strong className="text-base">{phone.number}</strong> {phone.name}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Glass>
  );
}
