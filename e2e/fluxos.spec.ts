import { Browser, expect, Page, test } from "@playwright/test";
import { devices } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, freeSlot } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs, waitForServerActions } from "./helpers";

const { barbershop, service, clienteA, admin } = FIXTURES;
const { clienteC } = E2E;

// Relógio do servidor (SCHEDULE_NOW) numa quarta futura: a home libera a sexta e o sábado dessa semana.
const friday = (() => {
  const date = futureWednesdayNoon();
  date.setUTCDate(date.getUTCDate() + 2);
  return date;
})();
const fridayLabel = `Sex ${friday.getUTCDate()}`;

// Na home: escolhe sexta + horário e abre o "Confirmar reserva" (2 serviços no e2e), sem confirmar.
const pickFridaySlot = async (page: Page, userId: string, time: string) => {
  await gotoLoggedIn(page, "/", userId);
  await page.getByRole("button", { name: new RegExp(`^${fridayLabel}`) }).click();
  await page.getByRole("button", { name: time, exact: true }).click();
  await page.getByRole("button", { name: `Reservar ${fridayLabel} às ${time}` }).click();
  const sheet = page.getByRole("dialog", { name: "Confirmar reserva" });
  await expect(sheet.getByRole("radio", { name: new RegExp(service.name) })).toBeChecked();
  return sheet;
};

const newMobileContext = (browser: Browser, baseURL: string | undefined) =>
  browser.newContext({ ...devices["Pixel 7"], baseURL, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });

test("deslogado: a home abre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(barbershop.name).first()).toBeVisible();
});

test("cliente comum reserva um horário livre e vê em Meus agendamentos", async ({ page, context }) => {
  await freeSlot(atSaoPauloTime(friday, "10:30"));
  await loginAs(context, clienteA.sessionToken);

  const sheet = await pickFridaySlot(page, clienteA.id, "10:30");
  const saved = waitForServerActions(page);
  await sheet.getByRole("button", { name: "Confirmar reserva" }).click();
  await saved;

  await expect(page.getByText(`Reservado! ${fridayLabel} às 10:30.`).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "10:30, ocupado" })).toBeDisabled();

  await page.goto("/bookings");
  await expect(page.getByText(service.name).first()).toBeVisible();
  // Horário no fuso de São Paulo (Prompt 22).
  await expect(page.getByText("10:30").first()).toBeVisible();
});

test("dois clientes no mesmo horário: o segundo vê a mensagem e a grade recarrega", async ({ page, context, browser, baseURL }) => {
  await freeSlot(atSaoPauloTime(friday, "11:30"));

  // Cliente A escolhe sexta 11:30 e abre o "Confirmar reserva", mas ainda não confirma.
  await loginAs(context, clienteA.sessionToken);
  const sheetA = await pickFridaySlot(page, clienteA.id, "11:30");

  // Cliente C, em outro navegador, reserva o mesmo horário antes.
  const contextC = await newMobileContext(browser, baseURL);
  try {
    await loginAs(contextC, clienteC.sessionToken);
    const pageC = await contextC.newPage();
    const sheetC = await pickFridaySlot(pageC, clienteC.id, "11:30");
    const savedC = waitForServerActions(pageC);
    await sheetC.getByRole("button", { name: "Confirmar reserva" }).click();
    await savedC;
    await expect(pageC.getByText(`Reservado! ${fridayLabel} às 11:30.`).first()).toBeVisible();
  } finally {
    await contextC.close();
  }

  // Cliente A confirma: recusa (horário tomado), o Sheet fecha e a grade recarrega com 11:30 ocupado.
  await sheetA.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(page.getByText("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.")).toBeVisible();
  await expect(page.getByRole("button", { name: "11:30, ocupado" })).toBeDisabled();
});

test("cliente comum que abre /adm volta para a home", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);

  await page.goto("/adm");
  await expect(page).toHaveURL(/\/$/);
});

// Usa a reserva passada do cliente C criada no setup: não depende dos testes acima.
test("admin abre /adm e vê a reserva do cliente", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);

  await page.goto("/adm");
  await expect(page).toHaveURL(/\/adm$/);
  await expect(page.getByRole("heading", { name: "Agendamentos dos clientes" })).toBeVisible();
  await expect(page.getByText(clienteC.name).first()).toBeVisible();
  await expect(page.getByText(service.name).first()).toBeVisible();
});
