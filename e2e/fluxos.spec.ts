import { expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { futureWednesdayNoon, loginAs } from "./helpers";

const { barbershop, service, clienteA, admin } = FIXTURES;

test("deslogado: a home abre", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(barbershop.name).first()).toBeVisible();
});

test("cliente comum reserva um horário livre e vê em Meus agendamentos", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);

  const wednesday = futureWednesdayNoon();
  await page.clock.setFixedTime(wednesday);
  const friday = new Date(wednesday);
  friday.setUTCDate(friday.getUTCDate() + 2);

  // Espera o useSession carregar; antes disso o botão manda para o login do Google.
  const sessionLoaded = page.waitForResponse(
    async (res) => res.url().endsWith("/api/auth/session") && (await res.json())?.user?.id === clienteA.id,
  );
  await page.goto(`/barbershop/${barbershop.id}`);
  await sessionLoaded;
  await page.getByRole("button", { name: "Reservar" }).first().click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Fazer Reserva")).toBeVisible();

  // Navega até o mês da sexta, se for outro mês.
  if (friday.getUTCMonth() !== wednesday.getUTCMonth()) {
    await sheet.getByRole("button", { name: "Go to next month" }).click();
  }
  // Só a sexta e o sábado ficam habilitados no calendário.
  await sheet.getByRole("gridcell", { name: String(friday.getUTCDate()), exact: true, disabled: false }).click();
  await sheet.getByRole("button", { name: "10:30" }).click();
  await sheet.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(page.getByText("Reserva realizada com sucesso!")).toBeVisible();

  await page.goto("/bookings");
  await expect(page.getByText(service.name).first()).toBeVisible();
});

test("cliente comum que abre /adm volta para a home", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);

  await page.goto("/adm");
  await expect(page).toHaveURL(/\/$/);
});

test("admin abre /adm e vê a reserva do cliente", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);

  await page.goto("/adm");
  await expect(page).toHaveURL(/\/adm$/);
  await expect(page.getByRole("heading", { name: "Agendamentos" })).toBeVisible();
  await expect(page.getByText(service.name).first()).toBeVisible();
});
