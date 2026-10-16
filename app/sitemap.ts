import type { MetadataRoute } from "next";
import { db } from "./_lib/prisma";
import { visibleBarbershopWhere } from "./_lib/barbershops";
import { SITE_URL } from "./_lib/site";

// Gerado a cada pedido: o build não consulta o banco.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const barbershops = await db.barbershop.findMany({
    where: visibleBarbershopWhere,
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
    ...barbershops.map((barbershop) => ({
      url: `${SITE_URL}/barbershop/${barbershop.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
