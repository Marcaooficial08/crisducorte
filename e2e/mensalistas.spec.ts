import { expect, Locator, Page, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs } from "./helpers";

// e2e com MENSALISTAS=all, ADMIN_PANEL_V2=admin e o relógio do servidor (SCHEDULE_NOW) numa quarta
// futura. Este arquivo usa a sexta às 16:30 (Pedro) e o sábado às 16:30 (conflito do João), nesta
// semana e nas seguintes, e um cliente próprio (o "mensalista com conta"). Limpa tudo no fim.
const { barbershop, service, clienteA, admin } = FIXTURES;
const pedroConta = {
  id: "test-mensalista-conta",
  name: "Pedro Mensal",
  email: "pedro-mensal@teste.local",
  sessionToken: "e2e-session-mensalista",
};

const wednesday = futureWednesdayNoon();
const plusDays = (days: number) => {
  const date = new Date(wednesday);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};
const friday = plusDays(2);
const saturday = plusDays(3);
const nextFriday = plusDays(9);
const nextSunday = plusDays(11);
const ddmm = (date: Date) => `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const fridayLabel = `Sex ${friday.getUTCDate()}`;
const MY_SLOTS = [0, 7, 14, 21].flatMap((days) => [
  atSaoPauloTime(plusDays(2 + days), "16:30"),
  atSaoPauloTime(plusDays(3 + days), "16:30"),
]);

const cleanUp = async () => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { OR: [{ mensalistaId: { not: null } }, { date: { in: MY_SLOTS } }] } });
    await db.mensalistaCycle.deleteMany({});
    await db.mensalista.deleteMany({});
  } finally {
    await db.$disconnect();
  }
};

test.beforeAll(async () => {
  await cleanUp();
  const db = testDb();
  try {
    await db.user.upsert({
      where: { id: pedroConta.id },
      update: {},
      create: {
        id: pedroConta.id,
        name: pedroConta.name,
        email: pedroConta.email,
        sessions: { create: { sessionToken: pedroConta.sessionToken, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
      },
    });
  } finally {
    await db.$disconnect();
  }
});
test.afterAll(cleanUp);

const card = (page: Page, name: string): Locator => page.getByRole("listitem", { name });

const createMensalista = async (page: Page, name: string, day: "Toda sexta" | "Todo sábado", email = "") => {
  await page.getByRole("button", { name: "Novo" }).click();
  const sheet = page.getByRole("dialog", { name: "Novo mensalista" });
  await sheet.getByLabel("Nome").fill(name);
  await sheet.getByLabel("WhatsApp com DDD").fill("(11) 98888-7777");
  if (email) {
    await sheet.getByLabel("E-mail da conta Google (opcional)").fill(email);
  }
  await sheet.getByText(day, { exact: true }).click();
  await sheet.getByText("16:30", { exact: true }).click();
  await sheet.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(`${name} cadastrado. Registre o pagamento para reservar os horários.`)).toBeVisible();
  await expect(card(page, name)).toContainText("Sem ciclo pago");
};

test("cadastra mensalista com ciclo em andamento, vê na grade e na home dele, conflito não grava, pausa libera", async ({
  page,
  context,
  browser,
}) => {
  // Fluxo longo (vários server actions contra o Neon): mais tempo que o padrão de 30s.
  test.setTimeout(120_000);
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/adm/mensalistas", admin.id);
  await expect(page.getByRole("link", { name: "Mensalistas" })).toHaveAttribute("aria-current", "page");

  // 1) Cadastro + pagamento de ciclo em andamento (2 restantes).
  await createMensalista(page, pedroConta.name, "Toda sexta", pedroConta.email);
  await card(page, pedroConta.name).getByRole("button", { name: "Registrar pagamento" }).click();
  const payment = page.getByRole("dialog", { name: `Registrar pagamento · ${pedroConta.name}` });
  await payment.getByText("Ciclo já em andamento").click();
  await payment.getByText("2", { exact: true }).click();
  await expect(payment.getByRole("region", { name: "Vai reservar" })).toContainText(`Sex ${ddmm(friday)} às 16:30`);
  await expect(payment.getByRole("region", { name: "Vai reservar" })).toContainText(`Sex ${ddmm(nextFriday)} às 16:30`);
  await payment.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(
    page.getByText(`Pagamento registrado: 2 reservas para ${pedroConta.name} (Sex ${ddmm(friday)}, Sex ${ddmm(nextFriday)}).`),
  ).toBeVisible();
  await expect(card(page, pedroConta.name)).toContainText(`3 de 4 — termina ${ddmm(nextSunday)}`);
  await expect(card(page, pedroConta.name)).toContainText(`Próximo: Sex ${ddmm(friday)} às 16:30`);

  // 2) Grade da semana: selo "Mensalista" e "Desmarcar esta semana".
  await page.getByRole("link", { name: "Agenda" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible();
  const row = page
    .getByRole("list", { name: `Horários de ${fridayLabel}` })
    .getByRole("listitem")
    .filter({ hasText: /^16:30/ });
  await expect(row).toContainText(pedroConta.name);
  await expect(row.getByText("Mensalista", { exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "Desmarcar esta semana 16:30" })).toBeVisible();

  // 3) Home do mensalista com conta: "Meu próximo agendamento", sem link de cancelar.
  const clientContext = await browser.newContext();
  try {
    await loginAs(clientContext, pedroConta.sessionToken);
    const clientPage = await clientContext.newPage();
    await gotoLoggedIn(clientPage, "/", pedroConta.id);
    const next = clientPage.getByRole("region", { name: "Meu próximo agendamento" });
    await expect(next.getByText("às 16:30 · Mensalista")).toBeVisible();
    await expect(next.getByRole("link")).toHaveCount(0);
    // Para os outros clientes, o horário aparece ocupado.
    await clientPage.getByRole("button", { name: new RegExp(`^${fridayLabel}`) }).click();
    await expect(clientPage.getByRole("button", { name: "16:30, ocupado" })).toBeDisabled();

    // /bookings também lista a reserva de mensalista (Prompt 22, 5a): selo e sem cancelar pelo app.
    await gotoLoggedIn(clientPage, "/bookings", pedroConta.id);
    const card = clientPage.getByRole("button").filter({ hasText: "Mensalista" }).first();
    await expect(card).toContainText("16:30");
    await card.click();
    const sheet = clientPage.getByRole("dialog", { name: "Informações da Reserva" });
    await expect(sheet.getByText("Para remarcar, fale com o Cris.")).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Cancelar Reserva" })).toHaveCount(0);
  } finally {
    await clientContext.close();
  }

  // 4) Conflito: sábado 16:30 desta semana já tem cliente → nada é gravado.
  const db = testDb();
  try {
    await db.booking.create({
      data: { userId: clienteA.id, serviceId: service.id, barbershopId: barbershop.id, date: atSaoPauloTime(saturday, "16:30") },
    });
  } finally {
    await db.$disconnect();
  }
  await page.getByRole("link", { name: "Mensalistas" }).click();
  await createMensalista(page, "João Mensal", "Todo sábado");
  await card(page, "João Mensal").getByRole("button", { name: "Registrar pagamento" }).click();
  const joaoPayment = page.getByRole("dialog", { name: "Registrar pagamento · João Mensal" });
  await joaoPayment.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(joaoPayment.getByRole("alert")).toContainText(`Sáb ${ddmm(saturday)} às 16:30 — Reserva de ${clienteA.name}`);
  await page.keyboard.press("Escape");
  await expect(card(page, "João Mensal")).toContainText("Sem ciclo pago");

  // 5) Pausar o Pedro cancela as 2 reservas futuras e o horário fica livre.
  await card(page, pedroConta.name).getByRole("button", { name: "Pausar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByText(`${pedroConta.name} pausado. 2 reservas futuras canceladas.`)).toBeVisible();
  await expect(page.getByRole("list", { name: "Mensalistas pausados" }).getByRole("listitem", { name: pedroConta.name })).toBeVisible();

  const check = testDb();
  try {
    expect(await check.booking.count({ where: { mensalistaId: { not: null } } })).toBe(0);
    expect(await check.bookingCancellation.count({ where: { source: "MENSALISTA", date: atSaoPauloTime(friday, "16:30") } })).toBeGreaterThan(0);
  } finally {
    await check.$disconnect();
  }
});
