import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/config";

/** Metadados do site todo (usados em src/app/layout.tsx; separados para poder testar). */

const OG_ALT = "Clima Cascavel – PR: tempo agora, previsão de 7 dias e El Niño ao vivo";

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Clima Cascavel – PR", template: "%s · Clima Cascavel" },
  description: "Condições atuais e previsão do tempo para Cascavel, Paraná.",
  applicationName: "Clima Cascavel",
  // iPhone: aberto pela Tela de Início, roda em tela cheia com a barra de status sobre o fundo escuro.
  appleWebApp: { capable: true, title: "Clima Cascavel", statusBarStyle: "black-translucent" },
  // Prévia ao compartilhar o link (WhatsApp, redes sociais). public/og.png vem de scripts/make-icons.mjs.
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Clima Cascavel",
    title: "Clima Cascavel – PR",
    description: "Tempo agora, previsão de 7 dias e El Niño ao vivo para Cascavel, Paraná.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const siteViewport: Viewport = {
  themeColor: "#0f172a",
  colorScheme: "dark",
  // Ocupa a tela toda no celular; o menu inferior respeita a área segura (safe-area).
  viewportFit: "cover",
};
