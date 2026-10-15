"use client";

import { useEffect } from "react";
import { Glass } from "@/components/home/Glass";

/** Erro inesperado (não relacionado ao provedor, que tem tela própria). */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative isolate flex-1 bg-gradient-to-b from-slate-900 to-slate-800">
      <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-10">
        <Glass as="div" className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold">Algo deu errado</h1>
          <p className="mt-2 text-base">
            Não foi possível carregar esta página. Nenhum dado foi exibido para evitar informações
            incorretas.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-4 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Tentar novamente
          </button>
        </Glass>
      </main>
    </div>
  );
}
