// Service worker do Clima Cascavel. Faz só duas coisas:
// 1. Sem internet, uma navegação mostra a página /offline (em vez do erro do navegador).
// 2. Guarda os arquivos estáticos do site (/_next/static, com nome único por versão),
//    para a página /offline aparecer com o visual do site.
// NADA de dados do tempo ou do El Niño é guardado: páginas e APIs sempre vêm da rede.

const VERSION = "v1";
const CACHE = `clima-cascavel-${VERSION}`;
const OFFLINE_URL = "/offline";
const MAX_STATIC_ENTRIES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staticFirst(request));
  }
});

/** Arquivo estático: nome muda a cada versão, então o que está guardado nunca fica velho. */
async function staticFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    trim(cache);
  }
  return response;
}

async function trim(cache) {
  const keys = (await cache.keys()).filter((request) => new URL(request.url).pathname.startsWith("/_next/static/"));
  for (const request of keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES))) await cache.delete(request);
}
