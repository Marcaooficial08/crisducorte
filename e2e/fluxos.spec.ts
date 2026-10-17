import { Browser, expect, Page, test } from "@playwright/test";
import { devices } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, freeSlot } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs, waitForServerActions } from "./helpers";

const { barbershop, service, clienteA, admin } = FIXTURES;
const { clienteC } = E2E;

// Relógio do navegador numa quarta futura: a agenda antiga libera a sexta e o sábado dessa semana.
const fixedWednesday = () => {
  const wednesday = futureWednesdayNoon();
  const friday = new Date(wednesday);
  friday.setUTCDate(friday.getUTCDate() + 2);
  return { wednesday, friday };
};

// Abre o painel de reserva e escolhe sexta + horário (sem confirmar).
const pickFridaySlot = async (page: Page, userId: string, time: string) => {
  const { wednesday, friday } = fixedWednesday();
  await page.clock.setFixedTime(wednesday);
  await gotoLoggedIn(page, `/barbershop/${barbershop.id}`, userId);
  await page.getByRole("button", { name: "Reservar" }).first().click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Fazer Reserva")).toBeVisible();
  if (friday.getUTCMonth() !== wednesday.getUTCMonth()) {
    await sheet.getByRole("button", { name: "Go to next month" }).click();
  }
  // Só a sexta e o sábado ficam habilitados no calendário.
  const dayBookingsLoaded = waitForServerActions(page);
  await sheet.getByRole("gridcell", { name: String(friday.getUTCDate()), exact: true, disabled: false }).click();
  await dayBookingsLoaded;
  await sheet.getByRole("button", { name: time }).click();
  return sheet;
};

const newMobileContext = (browser: Browser, baseURL: string | undefined) =>
  browser.newContext({ ...devices["Pixel 7"], baseURL, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });

test("deslogado: a home abre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(barbershop.name).first()).toBeVisible();
});

test("cliente comum reserva um horário livre e vê em Meus agendamentos", async ({ page, context }) => {
  await freeSlot(atSaoPauloTime(fixedWednesday().friday, "10:30"));
  await loginAs(context, clienteA.sessionToken);

  const sheet = await pickFridaySlot(page, clienteA.id, "10:30");
  const saved = waitForServerActions(page);
  await sheet.getByRole("button", { name: "Confirmar reserva" }).click();
  await saved;

  await expect(page.getByText("Reserva realizada com sucesso!")).toBeVisible();

  await page.goto("/bookings");
  await expect(page.getByText(service.name).first()).toBeVisible();
});

test("dois clientes no mesmo horário: o segundo vê a mensagem e a grade recarrega", async ({ page, context, browser, baseURL }) => {
  const slot = atSaoPauloTime(fixedWednesday().friday, "11:30");
  await freeSlot(slot);

  // Cliente A abre o painel e escolhe sexta 11:30, mas ainda não confirma.
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
    await expect(pageC.getByText("Reserva realizada com sucesso!")).toBeVisible();
  } finally {
    await contextC.close();
  }

  // Cliente A confirma: recusa (P2002/horário tomado) + recarga das reservas do dia.
  const rejectedAndReloaded = waitForServerActions(page, 2);
  await sheetA.getByRole("button", { name: "Confirmar reserva" }).click();
  await rejectedAndReloaded;

  await expect(page.getByText("Esse horário acabou de ser reservado por outra pessoa. Escolha outro.")).toBeVisible();
  await expect(sheetA.getByRole("button", { name: "11:30" })).toHaveCount(0);
  await expect(sheetA.getByRole("button", { name: "Confirmar reserva" })).toBeDisabled();
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
