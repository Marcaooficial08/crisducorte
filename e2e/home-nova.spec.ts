import { expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs, waitForServerActions } from "./helpers";

// e2e roda com NEW_HOME=all e o relógio do servidor (SCHEDULE_NOW) numa quarta futura.
const { barbershop, service, clienteA, admin } = FIXTURES;
const { clienteC } = E2E;

const friday = (() => {
  const date = futureWednesdayNoon();
  date.setUTCDate(date.getUTCDate() + 2);
  return date;
})();
const fridayLabel = `Sex ${friday.getUTCDate()}`;
const bookedSlot = atSaoPauloTime(friday, "12:30"); // de outro cliente
const mySlot = atSaoPauloTime(friday, "13:30"); // reservado pelo admin na home nova

const cleanUp = async () => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: { in: [bookedSlot, mySlot] } } });
  } finally {
    await db.$disconnect();
  }
};

test.afterAll(cleanUp);

test("cliente comum vê a home nova e a antiga em /classic", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/", clienteA.id);
  await expect(page.getByRole("heading", { level: 1, name: "Olá, Cliente!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Escolha o dia" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recomendados" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Reservas da semana (admin)" })).toHaveCount(0);

  await page.goto("/classic");
  await expect(page).toHaveURL(/\/classic$/);
  await expect(page.getByRole("heading", { name: "Recomendados" })).toBeVisible();
});

test("admin vê a home nova e a antiga em /classic", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);
  await expect(page.getByRole("heading", { level: 1, name: "Olá, Admin!" })).toBeVisible();
  await expect(page.getByText(barbershop.address)).toBeVisible();
  await expect(page.getByText("Sex e Sáb")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Escolha o dia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Escolha um horário" })).toBeDisabled();
  // Sem busca e sem as listas antigas.
  await expect(page.getByRole("heading", { name: "Recomendados" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Populares" })).toHaveCount(0);

  await page.goto("/classic");
  await expect(page).toHaveURL(/\/classic$/);
  await expect(page.getByRole("heading", { name: "Recomendados" })).toBeVisible();
});

test("admin reserva pela home nova em 3 toques; ocupado fica riscado e desabilitado", async ({ page, context }) => {
  await cleanUp();
  const db = testDb();
  try {
    await db.booking.create({ data: { userId: clienteC.id, serviceId: service.id, barbershopId: barbershop.id, date: bookedSlot } });
  } finally {
    await db.$disconnect();
  }

  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);

  // Abre na sexta (primeiro dia com horário livre).
  await expect(page.getByRole("button", { name: new RegExp(`^${fridayLabel}`) })).toHaveAttribute("aria-pressed", "true");
  const occupied = page.getByRole("button", { name: "12:30, ocupado" });
  await expect(occupied).toBeDisabled();
  await expect(occupied).toHaveCSS("text-decoration-line", "line-through");

  // Toque 1: horário.
  await page.getByRole("button", { name: "13:30", exact: true }).click();
  // Toque 2: CTA (2 serviços → abre o Sheet com o primeiro já marcado).
  await page.getByRole("button", { name: `Reservar ${fridayLabel} às 13:30` }).click();
  const sheet = page.getByRole("dialog", { name: "Confirmar reserva" });
  await expect(sheet.getByRole("radio", { name: /Corte de Cabelo/ })).toBeChecked();
  await expect(sheet.getByRole("radio", { name: /Barba/ })).not.toBeChecked();
  // Toque 3: confirmar.
  const saved = waitForServerActions(page);
  await sheet.getByRole("button", { name: "Confirmar reserva" }).click();
  await saved;

  await expect(page.getByText(`Reservado! ${fridayLabel} às 13:30.`)).toBeVisible();
  // A grade recarrega: o horário reservado vira ocupado.
  await expect(page.getByRole("button", { name: "13:30, ocupado" })).toBeDisabled();

  const next = page.getByRole("region", { name: "Meu próximo agendamento" });
  await expect(next.getByText("às 13:30 · Confirmado")).toBeVisible();
  await expect(next.getByText(service.name)).toBeVisible();

  // Visão do admin: reservas da semana (inclusive de outros clientes) + link para /adm.
  const adminSection = page.getByRole("region", { name: "Reservas da semana (admin)" });
  await expect(adminSection.getByRole("button").first()).toBeVisible();
  // Outras specs também reservam nesta semana: pelo menos a do cliente C e a do admin.
  expect(await adminSection.getByRole("button").count()).toBeGreaterThanOrEqual(2);
  await expect(adminSection.getByRole("link", { name: "Ver agenda completa" })).toHaveAttribute("href", "/adm");

  const db2 = testDb();
  try {
    const booking = await db2.booking.findFirst({ where: { barbershopId: barbershop.id, date: mySlot } });
    expect(booking?.userId).toBe(admin.id);
    expect(booking?.serviceId).toBe(service.id);
  } finally {
    await db2.$disconnect();
  }
});
