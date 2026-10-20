import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { Glass } from "@/components/home/Glass";

export const metadata: Metadata = {
  title: "Sem conexão",
  robots: { index: false },
};

/**
 * Mostrada pelo service worker (public/sw.js) quando o app é aberto sem
 * internet. De propósito, nenhum dado do tempo fica guardado no aparelho:
 * mostrar uma previsão antiga como se fosse atual seria pior que não mostrar.
 * Os estilos em linha garantem a leitura mesmo se o CSS não estiver em cache.
 */
export default function OfflinePage() {
  return (
    <div className="relative isolate flex-1 bg-gradient-to-b from-slate-900 to-slate-800" style={{ background: "#0f172a" }}>
      <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-10" style={{ maxWidth: "36rem", margin: "0 auto", padding: "2.5rem 1rem" }}>
        <Glass as="div" className="p-6 sm:p-8">
          <p className="flex items-center gap-2 text-sm font-medium text-white/90" style={{ color: "#fff" }}>
            <WifiOff aria-hidden="true" className="size-4 text-amber-300" style={{ width: 16, height: 16 }} />
            Sem conexão com a internet
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight" style={{ color: "#fff", fontSize: "1.75rem" }}>
            Não foi possível carregar o Clima Cascavel
          </h1>
          <p className="mt-2 text-base" style={{ color: "#fff" }}>
            Os dados do tempo e do El Niño precisam de internet para estar atualizados. Por isso o app
            não guarda previsões no aparelho: ver uma previsão antiga como se fosse a de agora pode
            confundir.
          </p>
          <p className="mt-2 text-base" style={{ color: "#fff" }}>
            Os alertas oficiais da Defesa Civil por SMS chegam mesmo sem internet, só com sinal de
            celular (cadastro gratuito: envie seu CEP para 40199).
          </p>
          {/* Recarregamento completo de propósito: navegação do cliente não serve sem conexão. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="glass-inner mt-5 inline-block rounded-xl px-4 py-2.5 font-medium ring-1 ring-white/30 hover:ring-white/60"
            style={{ color: "#fff", display: "inline-block", marginTop: "1.25rem" }}
          >
            Tentar de novo
          </a>
        </Glass>
      </main>
    </div>
  );
}
