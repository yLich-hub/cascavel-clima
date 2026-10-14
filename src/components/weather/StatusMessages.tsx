import { TriangleAlert } from "lucide-react";
import { formatTime } from "@/lib/format";
import type { DataMeta } from "@/types/weather";

/** Provedor falhou e estamos mostrando o último dado bom. */
export function FallbackNotice({ fetchedAt }: { fetchedAt: string }) {
  return (
    <div role="status" className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p>
        Não conseguimos atualizar a previsão agora. Mostrando os últimos dados obtidos às{" "}
        <strong>{formatTime(fetchedAt)}</strong>.
      </p>
    </div>
  );
}

/** Sem dado nenhum: nunca preencher com valores de exemplo. */
export function WeatherUnavailable() {
  return (
    <section aria-labelledby="indisponivel" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <h2 id="indisponivel" className="text-base font-semibold text-zinc-900">
        Previsão indisponível no momento
      </h2>
      <p className="mt-2 text-sm text-zinc-700">
        Não conseguimos obter dados meteorológicos agora. Tente recarregar a página em alguns
        minutos. Enquanto isso, consulte as fontes oficiais em{" "}
        <a href="#alertas-oficiais" className="text-sky-700 underline underline-offset-2">
          Alertas oficiais
        </a>
        .
      </p>
    </section>
  );
}

/** Atribuição exigida pela licença CC BY 4.0, junto dos dados. */
export function SourceNote({ attribution }: { attribution: DataMeta["attribution"] }) {
  return (
    <p className="text-xs text-zinc-600">
      Fonte: modelos numéricos via{" "}
      <a href={attribution.url} className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">
        Open-Meteo.com
      </a>{" "}
      (
      <a href={attribution.licenseUrl} className="underline underline-offset-2" rel="noopener noreferrer" target="_blank">
        licença {attribution.license}
      </a>
      ). Valores arredondados e traduzidos.
    </p>
  );
}

export function WeatherSkeleton() {
  return (
    <div aria-busy="true" className="space-y-4">
      <span className="sr-only">Carregando previsão…</span>
      {[44, 36, 64].map((height) => (
        <div
          key={height}
          aria-hidden="true"
          style={{ height: `${height * 4}px` }}
          className="animate-pulse rounded-2xl bg-zinc-200/70"
        />
      ))}
    </div>
  );
}
