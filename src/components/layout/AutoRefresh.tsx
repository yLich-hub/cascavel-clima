"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

/** Hora de atualizar? Só com a aba visível e depois do intervalo mínimo. */
export const shouldRefresh = (lastAt: number, now: number, visible: boolean, everyMs: number) =>
  visible && now - lastAt >= everyMs;

type Props = {
  /** Intervalo mínimo entre atualizações. Igual ao cache do servidor: buscar antes não traz dado novo. */
  everyMs: number;
};

/**
 * Atualiza os dados da página sozinho enquanto ela está aberta e visível.
 * - Aba escondida: não faz nada (sem gasto à toa); ao voltar, atualiza se já passou o intervalo.
 * - Voltou a internet: atualiza na hora.
 * `router.refresh()` busca de novo só as partes dinâmicas (dados), dentro de uma
 * transição: a tela antiga fica até a nova chegar, sem piscar o carregamento.
 */
export function AutoRefresh({ everyMs }: Props) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      last = Date.now();
      startTransition(() => router.refresh());
    };
    const tick = () => {
      if (shouldRefresh(last, Date.now(), document.visibilityState === "visible", everyMs)) refresh();
    };

    const timer = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", refresh);
    };
  }, [router, everyMs]);

  return null;
}
