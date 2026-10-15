"use client";

import { useEffect } from "react";

/**
 * Último recurso: erro no próprio layout raiz. Substitui o layout inteiro e não
 * carrega o CSS do site, por isso usa estilos inline. Nenhum dado é exibido.
 */
export default function GlobalError({
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
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          background: "#0f172a",
          color: "#ffffff",
        }}
      >
        <title>Erro · Clima Cascavel</title>
        <main style={{ maxWidth: "36rem", margin: "0 auto", padding: "2.5rem 1rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Algo deu errado</h1>
          <p style={{ fontSize: "1rem", color: "#ffffff" }}>
            Não foi possível carregar o site. Nenhum dado foi exibido para evitar informações
            incorretas.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              border: 0,
              borderRadius: "0.5rem",
              background: "#0369a1",
              color: "#fff",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
