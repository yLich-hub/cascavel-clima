"use client";

import { useEffect } from "react";

/** Registra public/sw.js (só em produção: em desenvolvimento ele atrapalharia o recarregamento). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => {
      console.error("[sw] registro falhou", error);
    });
  }, []);
  return null;
}
