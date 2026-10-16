import { expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";

const SITE_URL = "https://crisducorte.vercel.app";

test("home tem título, descrição e prévia de link (Open Graph e Twitter)", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Cris du Corte");
  const meta = (selector: string) => page.locator(selector).first().getAttribute("content");

  expect(await meta('meta[name="description"]')).toBe(
    "Barbearia Cris du Corte em Belo Horizonte. Agende seu corte online na sexta ou no sábado.",
  );
  expect(await meta('meta[property="og:title"]')).toBe("Cris du Corte — Agende seu horário");
  expect(await meta('meta[property="og:locale"]')).toBe("pt_BR");
  expect(await meta('meta[property="og:image:width"]')).toBe("1200");
  expect(await meta('meta[property="og:image:height"]')).toBe("630");
  expect(await meta('meta[name="twitter:card"]')).toBe("summary_large_image");
  expect(await meta('meta[name="twitter:title"]')).toBe("Cris du Corte — Agende seu horário");

  const ogImage = await meta('meta[property="og:image"]');
  expect(ogImage).toMatch(new RegExp(`^${SITE_URL}/opengraph-image\\.png`));
  expect(await meta('meta[name="twitter:image"]')).toMatch(new RegExp(`^${SITE_URL}/twitter-image\\.png`));

  // A imagem existe no próprio servidor (mesmo caminho, sem o domínio de produção).
  const imageResponse = await page.request.get(new URL(ogImage!).pathname);
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()["content-type"]).toBe("image/png");
});

test("páginas internas usam o modelo de título", async ({ page }) => {
  await page.goto("/privacidade");
  await expect(page).toHaveTitle("Política de Privacidade · Cris du Corte");
});

test("home tem JSON-LD HairSalon com endereço e horário", async ({ page }) => {
  await page.goto("/");

  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw ?? "");

  expect(data["@type"]).toBe("HairSalon");
  expect(data.name).toBe("Cris du Corte");
  expect(data.url).toBe(SITE_URL);
  expect(data.telephone).toBe("+55 31 97357-6347");
  expect(data.address).toMatchObject({
    "@type": "PostalAddress",
    streetAddress: "R. Nossa Sra. de Fátima, 2255",
    addressLocality: "Belo Horizonte",
    addressRegion: "MG",
    postalCode: "30250-450",
    addressCountry: "BR",
  });
  expect(data.openingHoursSpecification).toEqual([
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["https://schema.org/Friday", "https://schema.org/Saturday"],
      opens: "09:00",
      closes: "20:30",
    },
  ]);
});

test("robots.txt bloqueia as áreas privadas", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();

  for (const path of ["/adm", "/perfil", "/bookings", "/api"]) {
    expect(body).toContain(`Disallow: ${path}`);
  }
  expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
});

test("sitemap.xml lista home, privacidade e a barbearia", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();

  expect(body).toContain(`<loc>${SITE_URL}</loc>`);
  expect(body).toContain(`<loc>${SITE_URL}/privacidade</loc>`);
  expect(body).toContain(`<loc>${SITE_URL}/barbershop/${FIXTURES.barbershop.id}</loc>`);
  expect(body).not.toContain("/adm");
});
