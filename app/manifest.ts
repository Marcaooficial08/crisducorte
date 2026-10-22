import type { MetadataRoute } from "next";
import { BRAND_BACKGROUND, SITE_DESCRIPTION, SITE_NAME } from "@/app/_lib/site";

// PWA instalável (Prompt 20, MEL-023; spec §4.8). Sempre publicado, fora de flag (decisão do dono, 2026-10-21):
// não muda nenhuma tela; só permite "Instalar app" e dá nome e ícone na tela inicial.
// Ícones em public/icons, gerados a partir de app/icon.png (maskable com o logo dentro da zona segura).
const manifest = (): MetadataRoute.Manifest => ({
  name: SITE_NAME,
  short_name: SITE_NAME,
  description: SITE_DESCRIPTION,
  id: "/",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  lang: "pt-BR",
  dir: "ltr",
  background_color: BRAND_BACKGROUND,
  theme_color: BRAND_BACKGROUND,
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
});

export default manifest;
