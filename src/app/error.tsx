"use client";

import { useEffect } from "react";

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
    <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-10">
      <h1 className="text-xl font-semibold text-zinc-900">Algo deu errado</h1>
      <p className="mt-2 text-sm text-zinc-700">
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
    </main>
  );
}
