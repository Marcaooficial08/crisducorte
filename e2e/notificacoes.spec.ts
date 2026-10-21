import { expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs, waitForServerActions } from "./helpers";

// e2e roda com NOTIFICACOES=admin e sem credenciais do Gmail (nenhum e-mail sai).
const { barbershop, clienteA, admin } = FIXTURES;

const friday = (() => {
  const date = futureWednesdayNoon();
  date.setUTCDate(date.getUTCDate() + 2);
  return date;
})();
const fridayLabel = `Sex ${friday.getUTCDate()}`;
const mySlot = atSaoPauloTime(friday, "15:30");
const PHONE = "31999998888";

// Telefone da barbearia só durante este arquivo: sem ele, o botão some (e os outros testes não mudam).
const restore = async () => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: mySlot } });
    await db.barbershop.update({ where: { id: barbershop.id }, data: { phone: null } });
    await db.user.update({ where: { id: admin.id }, data: { emailReminders: true } });
  } finally {
    await db.$disconnect();
  }
};

test.afterAll(restore);

test("cliente comum não vê o switch de lembretes (flag só para o admin)", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/perfil", clienteA.id);

  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  await expect(page.getByRole("switch", { name: /Lembretes por e-mail/ })).toHaveCount(0);
});

test("admin desliga e liga os lembretes no Perfil; fica salvo", async ({ page, context }) => {
  await restore();
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/perfil", admin.id);

  const toggle = page.getByRole("switch", { name: /Lembretes por e-mail/ });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  const box = await toggle.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  const saved = waitForServerActions(page);
  await toggle.click();
  await saved;
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  await gotoLoggedIn(page, "/perfil", admin.id);
  await expect(page.getByRole("switch", { name: /Lembretes por e-mail/ })).toHaveAttribute("aria-checked", "false");
});

test("admin reserva e vê o botão do WhatsApp com o texto pronto", async ({ page, context }) => {
  await restore();
  const db = testDb();
  try {
    await db.barbershop.update({ where: { id: barbershop.id }, data: { phone: PHONE } });
  } finally {
    await db.$disconnect();
  }

  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);

  await page.getByRole("button", { name: "15:30", exact: true }).click();
  await page.getByRole("button", { name: `Reservar ${fridayLabel} às 15:30` }).click();
  const sheet = page.getByRole("dialog", { name: "Confirmar reserva" });
  const saved = waitForServerActions(page);
  await sheet.getByRole("button", { name: "Confirmar reserva" }).click();
  await saved;

  const whatsapp = page.getByRole("link", { name: "Enviar confirmação no WhatsApp" });
  await expect(whatsapp).toBeVisible();
  const href = (await whatsapp.getAttribute("href")) ?? "";
  const url = new URL(href);
  expect(`${url.origin}${url.pathname}`).toBe(`https://wa.me/55${PHONE}`);
  expect(url.searchParams.get("text")).toContain("às 15:30 pelo app. Endereço: Rua dos Testes, 1.");
  await expect(whatsapp).toHaveAttribute("target", "_blank");
});

test("link de opt-out inválido não desliga nada", async ({ page }) => {
  await page.goto("/notificacoes/lembretes?u=qualquer&t=errado");

  await expect(page.getByText("Link inválido.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Desligar lembretes" })).toHaveCount(0);
});
