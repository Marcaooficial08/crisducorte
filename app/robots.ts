import type { MetadataRoute } from "next";
import { SITE_URL } from "./_lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/adm", "/perfil", "/bookings", "/api", "/classic"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
