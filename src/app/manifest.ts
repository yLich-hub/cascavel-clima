import type { MetadataRoute } from "next";
import { LOCATION } from "@/lib/config";

/**
 * Manifesto do app instalável (PWA). Com ele e HTTPS, Android e computadores
 * oferecem "Instalar app"; no iPhone, "Adicionar à Tela de Início" (Safari).
 * Ícones gerados por scripts/make-icons.mjs a partir de src/app/icon.svg.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `Clima ${LOCATION.name} – ${LOCATION.state}`,
    short_name: `Clima ${LOCATION.name}`,
    description: "Condições atuais, previsão do tempo e situação do El Niño para Cascavel, Paraná.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["weather"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Desenho dentro da zona segura: o Android pode recortar em círculo sem cortar o sol/nuvem.
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "El Niño ao vivo", short_name: "El Niño", url: "/el-nino", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
