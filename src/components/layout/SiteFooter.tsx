import Link from "next/link";
import { ATTRIBUTION } from "@/lib/config";

export function SiteFooter() {
  const { openMeteo } = ATTRIBUTION;
  return (
    <footer className="site-footer border-t">
      <div className="site-nav mx-auto w-full max-w-6xl space-y-2 px-4 py-5 text-xs text-white">
        <p>
          Dados meteorológicos:{" "}
          <a href={openMeteo.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Open-Meteo.com
          </a>{" "}
          (
          <a href={openMeteo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            licença {openMeteo.license}
          </a>
          ).{" "}
          <Link href="/sobre" className="underline underline-offset-2">
            Sobre os dados e as fontes
          </Link>
          .
        </p>
        <p>
          Projeto de portfólio, sem fins comerciais. Não é um serviço meteorológico oficial e não
          emite alertas.
        </p>
      </div>
    </footer>
  );
}
