import { getFlagMode } from "@/app/_lib/flags";

// Service worker escrito à mão (Prompt 20, decisões D1–D3), servido por app/sw.js/route.ts.
//
// Cache só de assets imutáveis: /_next/static/* (nome com hash, inclui as fontes do next/font) em
// cache-first; /icons/* e /brand/* em stale-while-revalidate. Todo o resto (páginas, RSC, Server Actions,
// /api, login do NextAuth, POST) o SW não intercepta: vai direto à rede, como sem SW. Sem modo offline.
//
// Cada deploy muda a versão (bytes diferentes): o navegador instala o SW novo, que assume na hora
// (skipWaiting + clients.claim) e apaga os caches das versões anteriores.

export const CACHE_PREFIX = "cdc-";

// Deploy na Vercel: o commit. Fora dela (local, e2e): fixo.
export const serviceWorkerVersion = (): string =>
  (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 12) || "local";

// Com a flag desligada, o /sw.js se remove sozinho de quem já o tem (rollback sem deploy de código).
export const isServiceWorkerEnabled = (): boolean => getFlagMode("PWA_INSTALL") !== "off";

export const serviceWorkerScript = (version: string): string => `// Cris du Corte · service worker ${version}
const CACHE = ${JSON.stringify(`${CACHE_PREFIX}static-${version}`)};

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith(${JSON.stringify(CACHE_PREFIX)}) && key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

const store = async (cache, request, response) => {
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
};

const cacheFirst = async (request) => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  return cached || store(cache, request, await fetch(request));
};

const staleWhileRevalidate = async (event, request) => {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((response) => store(cache, request, response));
  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }
  return network;
};

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(staleWhileRevalidate(event, request));
  }
  // Todo o resto vai direto à rede (sem respondWith).
});
`;

export const killSwitchScript = (): string => `// Cris du Corte · service worker desligado (PWA_INSTALL=off): apaga os caches e se remove.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith(${JSON.stringify(CACHE_PREFIX)})).map((key) => caches.delete(key)));
      await self.registration.unregister();
    })(),
  );
});
`;
