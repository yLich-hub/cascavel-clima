import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança em todas as respostas.
 *
 * A CSP é parcial de propósito: uma política completa para scripts exigiria
 * nonce por requisição, o que tornaria todas as páginas dinâmicas. Aqui ela
 * só bloqueia o site dentro de iframes de terceiros, plugins e troca de base/
 * destino de formulários. HSTS sem `preload` (exige inscrição e é difícil de
 * desfazer).
 */
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
