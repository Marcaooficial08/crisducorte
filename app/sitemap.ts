import type { MetadataRoute } from "next";
import { SITE_URL } from "./_lib/site";

// A reserva é toda na home (Prompt 22: a /barbershop/[id] virou redirecionamento para /).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
