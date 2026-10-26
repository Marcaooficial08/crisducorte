import { expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs, waitForServerActions } from "./helpers";

// "Adicionar ao calendário" (Prompt 20) para todos desde o Prompt 22 (sem a flag CALENDARIO).
const { barbershop, service, clienteA, admin } = FIXTURES;

const friday = (() => {
  const date = futureWednesdayNoon();
  date.setUTCDate(date.getUTCDate() + 2);
  return date;
})();
const fridayLabel = `Sex ${friday.getUTCDate()}`;
const fridayDate = friday.toISOString().slice(0, 10);
const adminSlot = atSaoPauloTime(friday, "17:30");
const clientSlot = atSaoPauloTime(friday, "18:30");
// 17:30 em São Paulo = 20:30 UTC; 1 hora de duração.
const compact = fridayDate.replace(/-/g, "");
const EXPECTED_DATES = `${compact}T203000Z/${compact}T213000Z`;

const cleanUp = async () => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: { in: [adminSlot, clientSlot] } } });
  } finally {
    await db.$disconnect();
  }
};

test.beforeAll(cleanUp);
test.afterAll(cleanUp);

test("admin reserva e adiciona ao calendário: Google Agenda e .ics com o horário certo", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);

  await page.getByRole("button", { name: "17:30", exact: true }).click();
  await page.getByRole("button", { name: `Reservar ${fridayLabel} às 17:30` }).click();
  const saved = waitForServerActions(page);
  await page.getByRole("dialog", { name: "Confirmar reserva" }).getByRole("button", { name: "Confirmar reserva" }).click();
  await saved;

  const success = page.locator('section[aria-labelledby="reserva-sucesso"]');
  await expect(success).toContainText(`Reservado! ${fridayLabel} às 17:30.`);
  const toggle = success.getByRole("button", { name: "Adicionar ao calendário" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(success.getByRole("link", { name: "Google Agenda" })).toBeHidden();
  const box = await toggle.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const google = new URL((await success.getByRole("link", { name: "Google Agenda" }).getAttribute("href")) ?? "");
  expect(google.searchParams.get("dates")).toBe(EXPECTED_DATES);
  expect(google.searchParams.get("ctz")).toBe("America/Sao_Paulo");
  expect(google.searchParams.get("location")).toBe(barbershop.address);
  expect(google.searchParams.get("text")).toBe(`${service.name} · Cris du Corte`);

  const icsHref = (await success.getByRole("link", { name: "Apple / Outlook" }).getAttribute("href")) ?? "";
  const response = await page.request.get(icsHref);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("text/calendar; charset=utf-8");
  const ics = (await response.text()).replace(/\r\n /g, "");
  const [start, end] = EXPECTED_DATES.split("/");
  expect(ics).toContain(`DTSTART:${start}\r\n`);
  expect(ics).toContain(`DTEND:${end}\r\n`);
  expect(ics).toContain("LOCATION:Rua dos Testes\\, 1\r\n");

  // Depois de recarregar, o mesmo botão aparece em "Meu próximo agendamento".
  await gotoLoggedIn(page, "/", admin.id);
  const next = page.locator("section", { has: page.getByRole("heading", { name: "Meu próximo agendamento" }) });
  await next.getByRole("button", { name: "Adicionar ao calendário" }).click();
  const nextGoogle = new URL((await next.getByRole("link", { name: "Google Agenda" }).getAttribute("href")) ?? "");
  expect(nextGoogle.searchParams.get("dates")).toBe(EXPECTED_DATES);
});

test("cliente comum também vê o botão e a rota do .ics responde", async ({ page, context }) => {
  const db = testDb();
  try {
    await db.booking.create({
      data: { barbershopId: barbershop.id, serviceId: service.id, userId: clienteA.id, date: clientSlot },
    });
  } finally {
    await db.$disconnect();
  }

  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/", clienteA.id);
  await expect(page.getByRole("heading", { name: "Meu próximo agendamento" })).toBeVisible();
  const next = page.getByRole("region", { name: "Meu próximo agendamento" });
  await expect(next.getByRole("button", { name: "Adicionar ao calendário" })).toBeVisible();

  const response = await page.request.get(`/api/calendario?data=${fridayDate}&hora=18:30&servico=${service.id}`);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("text/calendar; charset=utf-8");
});
