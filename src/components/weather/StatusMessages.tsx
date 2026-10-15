import { TriangleAlert } from "lucide-react";
import { Glass } from "@/components/home/Glass";
import { formatTime } from "@/lib/format";
import type { DataMeta } from "@/types/weather";

/** Provedor falhou e estamos mostrando o último dado bom. */
export function FallbackNotice({ fetchedAt }: { fetchedAt: string }) {
  return (
    <Glass as="div" className="flex gap-3 text-sm ring-amber-300/60">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-300" />
      <p role="status">
        Não conseguimos atualizar a previsão agora. Mostrando os últimos dados obtidos às{" "}
        <strong>{formatTime(fetchedAt)}</strong>.
      </p>
    </Glass>
  );
}

/** Sem dado nenhum: nunca preencher com valores de exemplo. */
export function WeatherUnavailable() {
  return (
    <Glass labelledBy="indisponivel">
      <h2 id="indisponivel" className="text-base font-medium">
        Previsão indisponível no momento
      </h2>
      <p className="mt-2 text-sm text-white">
        Não conseguimos obter dados meteorológicos agora. Tente recarregar a página em alguns
        minutos. Enquanto isso, consulte as fontes oficiais em{" "}
        <a href="#alertas-oficiais" className="underline underline-offset-2">
          Alertas oficiais
        </a>
        .
      </p>
    </Glass>
  );
}

/** Atribuição exigida pela licença CC BY 4.0, junto dos dados. Usar dentro de um card de vidro. */
export function SourceNote({ attribution }: { attribution: DataMeta["attribution"] }) {
  return (
    <p className="text-sm text-white/90">
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
    <div aria-busy="true" className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <span className="sr-only">Carregando previsão…</span>
      {[80, 56, 44, 44].map((height, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{ height: `${height * 4}px` }}
          className={`animate-pulse rounded-3xl bg-white/10 ring-1 ring-white/10 ${i === 0 ? "lg:row-span-3" : ""}`}
        />
      ))}
    </div>
  );
}
