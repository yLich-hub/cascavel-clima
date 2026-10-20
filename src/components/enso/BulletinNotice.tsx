import { BellRing, Info } from "lucide-react";
import { Glass } from "@/components/home/Glass";
import type { BulletinChange } from "@/lib/enso/bulletin";
import { CPC_URLS } from "@/lib/enso/urls";
import { formatDate } from "@/lib/format";

const quoted = (names: string[]) => names.map((name) => `“${name}”`).join(" e ");

/**
 * Aviso automático quando sai um boletim do NOAA mais novo que o usado nos
 * textos da página. Só repete fatos do boletim (data e situação).
 */
export function BulletinNotice({ change }: { change: BulletinChange }) {
  if (change.kind === "none") return null;
  const changed = change.kind === "status-changed";
  const Icon = changed ? BellRing : Info;

  return (
    <Glass as="div" className={changed ? "ring-2 ring-amber-300/80" : "ring-sky-300/50"}>
      <div
        role="status"
        className={`glass-inner flex gap-3 rounded-2xl border-l-4 p-4 text-base ring-1 ring-white/20 ${
          changed ? "border-amber-300" : "border-sky-300"
        }`}
      >
        <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${changed ? "text-amber-300" : "text-sky-300"}`} />
        <p>
          {changed ? (
            <>
              <strong>A situação oficial do El Niño mudou.</strong> No boletim do NOAA de{" "}
              {formatDate(change.issuedOn)}, passou de {quoted(change.from)} para {quoted(change.to)}.
            </>
          ) : (
            <>
              <strong>Saiu um novo boletim do NOAA</strong> ({formatDate(change.issuedOn)}). A situação
              oficial continua {quoted(change.statuses)}.
            </>
          )}{" "}
          Os números de “Agora no Pacífico” já são do boletim novo; os textos explicativos foram
          escritos a partir do boletim de {formatDate(change.reviewedOn)} e podem não refletir as
          novidades. Veja o{" "}
          <a href={CPC_URLS.discussion} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            boletim completo
          </a>
          .
        </p>
      </div>
    </Glass>
  );
}
