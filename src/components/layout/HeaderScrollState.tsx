"use client";

import { useEffect } from "react";

/**
 * Marca `html[data-scrolled]` quando a página saiu do topo: o cabeçalho fixo
 * fica mais escuro e ganha sombra (globals.css). Só um atributo, nada de
 * estado React re-renderizando a página a cada rolagem.
 */
export function HeaderScrollState() {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      document.documentElement.toggleAttribute("data-scrolled", window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
