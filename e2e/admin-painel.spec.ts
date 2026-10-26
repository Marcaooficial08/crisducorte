import { expect, Locator, Page, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs } from "./helpers";

// e2e com o relógio do servidor (SCHEDULE_NOW) numa quarta futura:
// a grade do /adm é a sexta e o sábado dessa semana. Este arquivo usa só a sexta às
// 09:00, 14:30, 17:30 e 18:30 (os outros horários da sexta são de outras specs) e limpa
// bloqueios e reservas no fim de cada teste.
const { barbershop, service, clienteA, admin } = FIXTURES;
const { clienteC } = E2E;

const wednesday = futureWednesdayNoon();
const friday = (() => {
  const date = new Date(wednesday);
  date.setUTCDate(date.getUTCDate() + 2);
  return date;
})();
const fridayLabel = `Sex ${friday.getUTCDate()}`;
const MY_TIMES = ["09:00", "14:30", "17:30", "18:30"];

const cleanUp = async () => {
  const db = testDb();
  try {
    await db.slotBlock.deleteMany({});
    await db.booking.deleteMany({
      where: { barbershopId: barbershop.id, date: { in: MY_TIMES.map((time) => atSaoPauloTime(friday, time)) } },
    });
  } finally {
    await db.$disconnect();
  }
};

test.beforeEach(cleanUp);
test.afterEach(cleanUp);

const openPanel = async (page: Page) => {
  await page.goto("/adm");
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${fridayLabel}`) })).toHaveAttribute("aria-pressed", "true");
};

const slotRow = (page: Page, time: string): Locator =>
  page
    .getByRole("list", { name: `Horários de ${fridayLabel}` })
    .getByRole("listitem")
    .filter({ hasText: new RegExp(`^${time}`) });

const expectTouchTarget = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
};

const canceladas = (page: Page) =>
  page.getByRole("region", { name: /Métricas/ }).locator("dt", { hasText: "Canceladas" }).locator("xpath=following-sibling::dd[1]");

test("admin bloqueia com motivo; cliente vê ocupado na home; admin desbloqueia", async ({
  page,
  context,
  browser,
}) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/adm", admin.id);
  await openPanel(page);

  await slotRow(page, "17:30").getByRole("button", { name: "Bloquear 17:30" }).click();
  const sheet = page.getByRole("dialog", { name: `Bloquear ${fridayLabel} às 17:30` });
  await sheet.getByLabel("Motivo (opcional)").fill("Médico");
  await sheet.getByRole("button", { name: "Bloquear" }).click();
  await expect(page.getByText("Horário 17:30 bloqueado.")).toBeVisible();
  await expect(slotRow(page, "17:30")).toContainText("Bloqueado · Médico");

  const clientContext = await browser.newContext();
  try {
    await loginAs(clientContext, clienteA.sessionToken);
    const clientPage = await clientContext.newPage();

    // Home: riscado e desabilitado, igual a um horário reservado.
    await gotoLoggedIn(clientPage, "/", clienteA.id);
    await clientPage.getByRole("button", { name: new RegExp(`^${fridayLabel}`) }).click();
    await expect(clientPage.getByRole("button", { name: "17:30, ocupado" })).toBeDisabled();
  } finally {
    await clientContext.close();
  }

  await slotRow(page, "17:30").getByRole("button", { name: "Desbloquear 17:30" }).click();
  await expect(page.getByText("Horário 17:30 desbloqueado.")).toBeVisible();
  await expect(slotRow(page, "17:30")).toContainText("Livre");
});

test("reserva manual aparece na grade com WhatsApp; cancelamento pelo admin libera o horário e conta nas métricas", async ({
  page,
  context,
}) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/adm", admin.id);
  await openPanel(page);
  await expect(page.getByText("Canceladas registradas desde 19/10/2026.")).toBeVisible();
  const canceladasAntes = Number(await canceladas(page).textContent());

  await slotRow(page, "18:30").getByRole("button", { name: "Reservar na mão 18:30" }).click();
  const sheet = page.getByRole("dialog", { name: `Reservar na mão · ${fridayLabel} às 18:30` });
  await sheet.getByLabel("Nome do cliente").fill("Maria Manual");
  await sheet.getByLabel("WhatsApp com DDD").fill("11 91234-5678");
  // 2 serviços no e2e: o primeiro ("Corte de Cabelo") já vem marcado.
  await expect(sheet.getByRole("radio", { name: service.name })).toBeChecked();
  await sheet.getByRole("button", { name: "Reservar" }).click();
  await expect(page.getByText(`Reservado para Maria Manual: ${fridayLabel} às 18:30.`)).toBeVisible();

  const row = slotRow(page, "18:30");
  await expect(row).toContainText("Maria Manual");
  await expect(row).toContainText(service.name);
  const whatsapp = row.getByRole("link", { name: "Chamar Maria Manual no WhatsApp" });
  await expect(whatsapp).toHaveAttribute("href", "https://wa.me/5511912345678");
  await expect(whatsapp).toHaveText("(11) 91234-5678");

  // "Lembrar no WhatsApp" (Prompt 22, 5b): wa.me do cliente com dia, horário e endereço prontos.
  const reminder = row.getByRole("link", { name: "Lembrar Maria Manual no WhatsApp" });
  const reminderUrl = new URL((await reminder.getAttribute("href")) ?? "");
  expect(`${reminderUrl.origin}${reminderUrl.pathname}`).toBe("https://wa.me/5511912345678");
  const text = reminderUrl.searchParams.get("text") ?? "";
  expect(text).toMatch(/^Olá, Maria! Passando para lembrar do seu horário com o Cris: /);
  expect(text).toContain(`${service.name}, sexta `);
  expect(text).toContain("às 18:30");
  expect(text).toContain(`Endereço: ${barbershop.address}.`);
  expect((await reminder.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  const db = testDb();
  try {
    const booking = await db.booking.findFirstOrThrow({ where: { date: atSaoPauloTime(friday, "18:30") } });
    expect(booking).toMatchObject({ userId: null, source: "MANUAL", customerName: "Maria Manual", customerPhone: "11912345678" });
  } finally {
    await db.$disconnect();
  }

  await row.getByRole("button", { name: "Cancelar reserva das 18:30" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Cancelar reserva de Maria Manual?" });
  await confirm.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(page.getByText("Reserva cancelada. O horário voltou a ficar livre.")).toBeVisible();
  await expect(slotRow(page, "18:30")).toContainText("Livre");
  await expect(canceladas(page)).toHaveText(String(canceladasAntes + 1));

  const db2 = testDb();
  try {
    const cancellation = await db2.bookingCancellation.findFirstOrThrow({
      where: { date: atSaoPauloTime(friday, "18:30") },
      orderBy: { cancelledAt: "desc" },
    });
    expect(cancellation).toMatchObject({ byAdmin: true, source: "MANUAL" });
  } finally {
    await db2.$disconnect();
  }
});

test("bloquear dia inteiro mantém a reserva existente; desbloquear dia libera tudo", async ({ page, context }) => {
  const db = testDb();
  try {
    await db.booking.create({
      data: { userId: clienteC.id, serviceId: service.id, barbershopId: barbershop.id, date: atSaoPauloTime(friday, "09:00") },
    });
  } finally {
    await db.$disconnect();
  }

  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/adm", admin.id);
  await openPanel(page);

  await page.getByRole("button", { name: "Bloquear dia inteiro" }).click();
  const sheet = page.getByRole("dialog", { name: `Bloquear ${fridayLabel} inteiro` });
  await sheet.getByLabel("Motivo (opcional)").fill("Feriado");
  await sheet.getByRole("button", { name: "Bloquear" }).click();
  // Outras specs também deixam reservas na sexta: o número exato varia, a reserva do cliente C fica.
  await expect(page.getByText(/^\d+ horários? bloqueados?, \d+ reservas? mantidas? \(cancele à parte se precisar\)\.$/)).toBeVisible();

  await expect(slotRow(page, "09:00")).toContainText(clienteC.name);
  await expect(slotRow(page, "14:30")).toContainText("Bloqueado · Feriado");
  await expect(slotRow(page, "18:30")).toContainText("Bloqueado · Feriado");
  await expect(page.getByRole("button", { name: "Bloquear dia inteiro" })).toBeDisabled();

  await page.getByRole("button", { name: "Desbloquear dia" }).click();
  await expect(page.getByText(/^\d+ horários? desbloqueados?\.$/)).toBeVisible();
  await expect(slotRow(page, "14:30")).toContainText("Livre");
  await expect(slotRow(page, "09:00")).toContainText(clienteC.name);
});

test("/adm com o painel: ações com 44px e sem rolagem horizontal em 390px", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/adm", admin.id);
  await openPanel(page);

  await expectTouchTarget(page.getByRole("button", { name: "Bloquear dia inteiro" }));
  await expectTouchTarget(page.getByRole("button", { name: "Bloquear 14:30" }));
  await expectTouchTarget(page.getByRole("button", { name: "Reservar na mão 14:30" }));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("/adm no computador: coluna centralizada e botões na mesma linha do horário", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/adm", admin.id);
  await openPanel(page);

  // max-w-2xl = 672px, centralizada.
  const list = await page.getByRole("list", { name: `Horários de ${fridayLabel}` }).boundingBox();
  expect(list!.width).toBeLessThanOrEqual(672);
  expect(Math.abs(list!.x + list!.width / 2 - 640)).toBeLessThanOrEqual(2);

  // Hora, estado e botões na mesma linha.
  const row = slotRow(page, "14:30");
  const time = await row.getByText("14:30", { exact: true }).boundingBox();
  const button = await row.getByRole("button", { name: "Bloquear 14:30" }).boundingBox();
  expect(Math.abs(time!.y + time!.height / 2 - (button!.y + button!.height / 2))).toBeLessThanOrEqual(12);
  expect(button!.x).toBeGreaterThan(time!.x + 200);
});
