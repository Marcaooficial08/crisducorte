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

// Com as duas flags desligadas, o /sw.js se remove sozinho de quem já o tem (rollback sem deploy de código).
// O push precisa do SW: WEB_PUSH ligada mantém o SW mesmo com PWA_INSTALL=off.
export const isServiceWorkerEnabled = (): boolean =>
  getFlagMode("PWA_INSTALL") !== "off" || getFlagMode("WEB_PUSH") !== "off";

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

// Web Push (Prompt 20). Todo push vira notificação visível (o iPhone cancela a inscrição se não virar).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = {};
  }
  const title = data.title || "Cris du Corte";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/icons/icon-192.png",
      lang: "pt-BR",
      data: { url: typeof data.url === "string" ? data.url : "/" },
    }),
  );
});

// Toque na notificação: foca uma aba/janela do app e abre a página do aviso (ou abre uma nova).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Só abre páginas do próprio site ("//outro-site" ou URL absoluta de fora viram a home).
  let url = new URL("/", self.location.origin).href;
  try {
    const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
    if (target.origin === self.location.origin) {
      url = target.href;
    }
  } catch (error) {
    // URL inválida: abre a home.
  }
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(url);
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
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
