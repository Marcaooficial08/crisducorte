import { SITE_NAME, SITE_URL } from "./site";

// Dados fixos da barbearia para buscadores (schema.org/HairSalon).
// O endereço do banco não é usado nem alterado aqui.
export const hairSalonJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: SITE_NAME,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image.png`,
  telephone: "+55 31 97357-6347",
  address: {
    "@type": "PostalAddress",
    streetAddress: "R. Nossa Sra. de Fátima, 2255",
    addressLocality: "Belo Horizonte",
    addressRegion: "MG",
    postalCode: "30250-450",
    addressCountry: "BR",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["https://schema.org/Friday", "https://schema.org/Saturday"],
      opens: "09:00",
      closes: "20:30",
    },
  ],
} as const;
