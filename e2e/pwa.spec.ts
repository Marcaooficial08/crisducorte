import { Page, devices, expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs, waitForServerActions } from "./helpers";

// e2e roda com PWA_INSTALL=admin (Prompt 20): manifest sempre; SW e dica de instalação só para o admin.
const { barbershop, clienteA, admin } = FIXTURES;

const saturday = (() => {
  const date = futureWednesdayNoon();
  date.setUTCDate(date.getUTCDate() + 3);
  return date;
})();
const saturdayLabel = `Sáb ${saturday.getUTCDate()}`;
const mySlot = atSaoPauloTime(saturday, "10:30");
const iphoneSlot = atSaoPauloTime(saturday, "11:30");

const cleanUp = async () => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: { in: [mySlot, iphoneSlot] } } });
  } finally {
    await db.$disconnect();
  }
};

test.beforeAll(cleanUp);
test.afterAll(cleanUp);

// Largura e altura reais do PNG (cabeçalho IHDR).
const pngSize = (buffer: Buffer) => `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;

test("manifest válido com ícones reais, theme-color e apple-touch-icon", async ({ page }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#15161A");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const response = await page.request.get(href ?? "");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "Cris du Corte",
    short_name: "Cris du Corte",
    start_url: "/",
    display: "standalone",
    background_color: "#15161A",
    theme_color: "#15161A",
  });
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons as { src: string; sizes: string; type: string }[]) {
    const file = await page.request.get(icon.src);
    expect(file.status(), icon.src).toBe(200);
    expect(file.headers()["content-type"]).toBe(icon.type);
    expect(pngSize(await file.body()), icon.src).toBe(icon.sizes);
  }
});

test("/sw.js sem cache e com o SW de assets (flag admin)", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/javascript; charset=utf-8");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.text()).toContain('const CACHE = "cdc-static-local";');
});

test("admin: SW assume a página, serve só assets e a reserva (Server Action) continua funcionando", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(new URL("/", page.url()).href);

  // Recarrega já controlada pelo SW: a página vem da rede; os chunks, do SW.
  const staticFromSw: boolean[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/_next/static/")) {
      staticFromSw.push(response.fromServiceWorker());
    }
  });
  const sessionLoaded = page.waitForResponse((res) => res.url().endsWith("/api/auth/session"));
  const navigation = await page.reload();
  await sessionLoaded;
  expect(navigation?.fromServiceWorker()).toBe(false);
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  expect(staticFromSw.length).toBeGreaterThan(0);
  expect(staticFromSw.every(Boolean)).toBe(true);

  await page.getByRole("button", { name: saturdayLabel }).click();
  await page.getByRole("button", { name: "10:30", exact: true }).click();
  await page.getByRole("button", { name: `Reservar ${saturdayLabel} às 10:30` }).click();
  const saved = waitForServerActions(page);
  await page.getByRole("dialog", { name: "Confirmar reserva" }).getByRole("button", { name: "Confirmar reserva" }).click();
  await saved;
  await expect(page.locator('section[aria-labelledby="reserva-sucesso"]')).toContainText(`Reservado! ${saturdayLabel} às 10:30.`);

  // Página nova depois da reserva: o horário aparece ocupado (nada de HTML velho do cache).
  await gotoLoggedIn(page, "/", admin.id);
  await page.getByRole("button", { name: saturdayLabel }).click();
  await expect(page.getByRole("button", { name: "10:30, ocupado" })).toBeDisabled();
});

test("cliente comum (flag só para o admin): nenhum SW registrado", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/", clienteA.id);
  // Tempo para o registro ocioso acontecer, se fosse acontecer.
  await page.waitForTimeout(2000);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
});

test.describe("iPhone", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...iphone } = devices["iPhone 13"];
  test.use(iphone);

  const hintOf = (page: Page) => page.locator('section[aria-labelledby="instalar-app"]');

  test("1ª visita sem dica; na 2ª, cartão de 1 linha que não esconde nada; ✕ fecha de vez", async ({ page, context }) => {
    await loginAs(context, admin.sessionToken);
    await gotoLoggedIn(page, "/", admin.id);
    await expect(page.getByRole("heading", { name: "Escolha o dia" })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(hintOf(page)).toHaveCount(0);
    // Recarregar é a mesma visita.
    await gotoLoggedIn(page, "/", admin.id);
    await page.waitForTimeout(500);
    await expect(hintOf(page)).toHaveCount(0);

    // Nova aba = nova sessão do navegador = 2ª visita.
    const second = await context.newPage();
    await gotoLoggedIn(second, "/", admin.id);
    const hint = hintOf(second);
    await expect(hint.getByRole("heading", { name: "Instale o app do Cris" })).toBeVisible();
    const install = hint.getByRole("button", { name: "Instalar" });
    const close = hint.getByRole("button", { name: "Agora não" });
    expect((await install.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    const closeBox = await close.boundingBox();
    expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    // 1 linha: título, "Instalar" e ✕ na mesma altura; instrução do Safari escondida até tocar em Instalar.
    expect((await hint.boundingBox())?.height ?? 0).toBeLessThan(70);
    const steps = hint.getByText("Adicionar à Tela de Início");
    await expect(steps).toBeHidden();

    // Espaço no fim da página = altura do cartão: o rodapé termina acima dele.
    const card = second.locator("div.fixed", { has: hint });
    const cardHeight = await card.evaluate((element) => (element as HTMLElement).offsetHeight);
    expect(await second.evaluate(() => document.body.style.paddingBottom)).toBe(`${cardHeight}px`);
    await second.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const footer = await second.locator("footer").boundingBox();
    const cardBox = await card.boundingBox();
    expect((footer?.y ?? 0) + (footer?.height ?? 0)).toBeLessThanOrEqual((cardBox?.y ?? 0) + 1);

    await install.click();
    await expect(install).toHaveAttribute("aria-expanded", "true");
    await expect(steps).toBeVisible();
    await expect(hint).toContainText("No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.");
    // O espaço acompanha a linha extra.
    const grown = await card.evaluate((element) => (element as HTMLElement).offsetHeight);
    expect(grown).toBeGreaterThan(cardHeight);
    await expect.poll(() => second.evaluate(() => document.body.style.paddingBottom)).toBe(`${grown}px`);

    await close.click();
    await expect(hint).toHaveCount(0);
    expect(await second.evaluate(() => document.body.style.paddingBottom)).toBe("");

    const third = await context.newPage();
    await gotoLoggedIn(third, "/", admin.id);
    await third.waitForTimeout(500);
    await expect(hintOf(third)).toHaveCount(0);
  });

  test("1ª visita: a dica aparece depois de reservar com sucesso", async ({ page, context }) => {
    await loginAs(context, admin.sessionToken);
    await gotoLoggedIn(page, "/", admin.id);
    await expect(hintOf(page)).toHaveCount(0);

    await page.getByRole("button", { name: saturdayLabel }).click();
    await page.getByRole("button", { name: "11:30", exact: true }).click();
    await page.getByRole("button", { name: `Reservar ${saturdayLabel} às 11:30` }).click();
    const saved = waitForServerActions(page);
    await page.getByRole("dialog", { name: "Confirmar reserva" }).getByRole("button", { name: "Confirmar reserva" }).click();
    await saved;

    await expect(hintOf(page).getByRole("heading", { name: "Instale o app do Cris" })).toBeVisible();
  });

  test("cliente comum não vê a dica nem na 2ª visita (flag só para o admin)", async ({ page, context }) => {
    await loginAs(context, clienteA.sessionToken);
    await gotoLoggedIn(page, "/", clienteA.id);
    const second = await context.newPage();
    await gotoLoggedIn(second, "/", clienteA.id);
    await expect(second.getByRole("heading", { name: "Escolha o dia" })).toBeVisible();
    await second.waitForTimeout(500);
    await expect(hintOf(second)).toHaveCount(0);
  });
});
