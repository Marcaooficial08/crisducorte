import { expect, Locator, Page, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, testDb } from "./db";
import { gotoLoggedIn, loginAs } from "./helpers";

const { clienteA, admin, service, barbershop } = FIXTURES;
const { clienteC } = E2E;

// Só teclado: Tab até o elemento (sem clique nem focus() direto).
const tabTo = async (page: Page, target: Locator) => {
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) {
      return;
    }
  }
  throw new Error("Elemento não recebeu foco pelo teclado.");
};

const menuButton = (page: Page) => page.getByRole("button", { name: "Abrir menu" });

const openMenuWithKeyboard = async (page: Page) => {
  await tabTo(page, menuButton(page));
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog).toBeVisible();
  return dialog;
};

test.afterAll(async () => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { userId: admin.id, date: E2E.adminBookingDate } });
  } finally {
    await db.$disconnect();
  }
});

const focusIsInside = (dialog: Locator) => dialog.evaluate((el) => el.contains(document.activeElement));

const menuLabels = (dialog: Locator) =>
  dialog.getByRole("navigation", { name: "Menu principal" }).getByRole("link").allTextContents();

test("deslogado: foco preso no menu, Esc fecha e o foco volta ao botão", async ({ page }) => {
  await page.goto("/");
  const dialog = await openMenuWithKeyboard(page);

  expect(await focusIsInside(dialog)).toBe(true);
  expect((await menuLabels(dialog)).map((t) => t.trim())).toEqual(["Início", "Privacidade", "Política de Privacidade"]);
  await expect(dialog.getByRole("button", { name: "Fazer login" })).toBeVisible();
  await expect(dialog.getByText("Ao entrar, você concorda com a")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Sair" })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page");

  // Tab e Shift+Tab dão a volta inteira sem sair do menu.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(await focusIsInside(dialog)).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await focusIsInside(dialog)).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(menuButton(page)).toBeFocused();
});

test("cliente: itens do menu, Enter navega e marca a página atual", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/", clienteA.id);

  let dialog = await openMenuWithKeyboard(page);
  expect((await menuLabels(dialog)).map((t) => t.trim())).toEqual([
    "Início",
    "Meus agendamentos",
    "Perfil",
    "Privacidade",
  ]);
  await expect(dialog.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Sair" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Fazer login" })).toHaveCount(0);

  await tabTo(page, dialog.getByRole("link", { name: "Meus agendamentos" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByRole("heading", { name: "Agendamentos" })).toBeVisible();

  dialog = await openMenuWithKeyboard(page);
  await expect(dialog.getByRole("link", { name: "Meus agendamentos" })).toHaveAttribute("aria-current", "page");
  await expect(dialog.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current", "page");

  await page.keyboard.press("Escape");
  await expect(menuButton(page)).toBeFocused();
});

test("admin: vê Admin e as próprias reservas em Meus agendamentos", async ({ page, context }) => {
  // Reserva do próprio admin só durante este teste.
  const db = testDb();
  const booking = { userId: admin.id, serviceId: service.id, barbershopId: barbershop.id, date: E2E.adminBookingDate };
  try {
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: E2E.adminBookingDate } });
    await db.booking.create({ data: booking });
  } finally {
    await db.$disconnect();
  }
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);

  let dialog = await openMenuWithKeyboard(page);
  expect((await menuLabels(dialog)).map((t) => t.trim())).toEqual([
    "Início",
    "Meus agendamentos",
    "Perfil",
    "Admin",
    "Privacidade",
  ]);

  await tabTo(page, dialog.getByRole("link", { name: "Meus agendamentos" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByRole("heading", { name: "Finalizados" })).toBeVisible();
  await expect(page.getByText(service.name).first()).toBeVisible();

  dialog = await openMenuWithKeyboard(page);
  await tabTo(page, dialog.getByRole("link", { name: "Admin" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/adm$/);
  await expect(page.getByRole("heading", { name: "Agendamentos dos clientes" })).toBeVisible();
});

// Sessão própria do cliente C, recriada a cada execução: o signOut apaga a sessão no banco.
test("Sair é um botão que funciona com Enter", async ({ page, context }) => {
  const db = testDb();
  try {
    await db.session.deleteMany({ where: { sessionToken: E2E.logoutSessionToken } });
    await db.session.create({
      data: { sessionToken: E2E.logoutSessionToken, userId: clienteC.id, expires: new Date(Date.now() + 60 * 60 * 1000) },
    });
  } finally {
    await db.$disconnect();
  }
  await loginAs(context, E2E.logoutSessionToken);
  await gotoLoggedIn(page, "/", clienteC.id);

  const dialog = await openMenuWithKeyboard(page);
  const sair = dialog.getByRole("button", { name: "Sair" });
  expect(await sair.evaluate((el) => el.tagName)).toBe("BUTTON");

  await tabTo(page, sair);
  const signedOut = page.waitForResponse((res) => res.url().includes("/api/auth/signout") && res.request().method() === "POST");
  // O signOut recarrega a página.
  const reloaded = page.waitForEvent("load");
  await page.keyboard.press("Enter");
  await signedOut;
  await reloaded;

  // A página recarregada pode ainda não ter hidratado: repete Tab + Enter até o menu abrir.
  const reopened = page.getByRole("dialog", { name: "Menu" });
  await expect(async () => {
    if (await reopened.isVisible()) {
      return;
    }
    await tabTo(page, menuButton(page));
    await page.keyboard.press("Enter");
    await expect(reopened).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(reopened.getByRole("button", { name: "Fazer login" })).toBeVisible();
});
