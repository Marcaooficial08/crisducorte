import { killSwitchScript, isServiceWorkerEnabled, serviceWorkerScript, serviceWorkerVersion } from "@/app/_lib/pwa/service-worker";

// /sw.js (Prompt 20): o service worker do PWA, com a versão do deploy. Nunca em cache do navegador
// nem da CDN: assim cada deploy (ou a flag desligada) chega na próxima visita.
export const dynamic = "force-dynamic";

export const GET = () =>
  new Response(isServiceWorkerEnabled() ? serviceWorkerScript(serviceWorkerVersion()) : killSwitchScript(), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
