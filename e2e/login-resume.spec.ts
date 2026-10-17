import { BrowserContext, Page, expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, loginAs, waitForServerActions } from "./helpers";

// Voltar com a seleção depois do login (MEL-009). e2e roda com NEW_HOME=all e SCHEDULE_NOW numa quarta futura.
// Sem Google: o POST do signIn é interceptado, o cookie de sessão é criado e a resposta manda para o callbackUrl.
const { barbershop, service, clienteA } = FIXTURES;
const { clienteC } = E2E;

const friday = (() => {
  const date = futureWednesdayNoon();
  date.setUTCDate(date.getUTCDate() + 2);
  return date;
})();
const fridayLabel = `Sex ${friday.getUTCDate()}`;
const resumedSlot = atSaoPauloTime(friday, "15:30"); // reservado pelo cliente depois do login
const takenSlot = atSaoPauloTime(friday, "16:30"); // ocupado por outro cliente durante o login

const cleanUp = async () => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: { in: [resumedSlot, takenSlot] } } });
  } finally {
    await db.$disconnect();
  }
};

test.beforeEach(cleanUp);
test.afterAll(cleanUp);

// Simula o "Entrar com Google": confere o callbackUrl, roda `whileAway` (o que acontece durante o login) e volta logado.
const fakeGoogleLogin = async (page: Page, context: BrowserContext, whileAway?: () => Promise<void>) => {
  const callbackUrls: string[] = [];
  await page.route("**/api/auth/signin/google", async (route) => {
    callbackUrls.push(new URLSearchParams(route.request().postData() ?? "").get("callbackUrl") ?? "");
    await whileAway?.();
    await loginAs(context, clienteA.sessionToken);
    await route.fulfill({ json: { url: "/?resume=1" } });
  });
  return callbackUrls;
};

const chooseSlotLoggedOut = async (page: Page, time: string) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Olá, vamos agendar um corte?" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`^${fridayLabel}`) })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: time, exact: true }).click();
  await page.getByRole("button", { name: `Reservar ${fridayLabel} às ${time}` }).click();
};

const expectResumeCleared = async (page: Page) => {
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => window.sessionStorage.getItem("crisducorte:booking-resume"))).toBeNull();
};

test("deslogado escolhe um horário, faz login e volta com o mesmo dia e horário para confirmar", async ({ page, context }) => {
  const callbackUrls = await fakeGoogleLogin(page, context);
  await chooseSlotLoggedOut(page, "15:30");

  // Volta logado: mesmo dia e horário; com 2 serviços o Sheet abre com o serviço marcado, sem confirmar sozinho.
  // (O Sheet é modal e esconde o resto da página; ele só abre para quem está logado.)
  const sheet = page.getByRole("dialog", { name: "Confirmar reserva" });
  await expect(sheet).toBeVisible();
  expect(callbackUrls).toEqual(["/?resume=1"]);
  await expect(sheet.getByRole("radio", { name: /Corte de Cabelo/ })).toBeChecked();
  await expect(sheet.getByText(fridayLabel)).toBeVisible();
  await expect(sheet.getByText("15:30")).toBeVisible();
  await expectResumeCleared(page);
  expect(await bookingAt(resumedSlot)).toBeNull();

  const saved = waitForServerActions(page);
  await sheet.getByRole("button", { name: "Confirmar reserva" }).click();
  await saved;
  await expect(page.getByText(`Reservado! ${fridayLabel} às 15:30.`)).toBeVisible();
  await expect(page.getByRole("button", { name: "15:30, ocupado" })).toBeDisabled();

  const booking = await bookingAt(resumedSlot);
  expect(booking?.userId).toBe(clienteA.id);
  expect(booking?.serviceId).toBe(service.id);
});

test("horário ocupado enquanto o cliente fazia login: aviso e grade para escolher outro", async ({ page, context }) => {
  await fakeGoogleLogin(page, context, async () => {
    const db = testDb();
    try {
      await db.booking.create({ data: { userId: clienteC.id, serviceId: service.id, barbershopId: barbershop.id, date: takenSlot } });
    } finally {
      await db.$disconnect();
    }
  });
  await chooseSlotLoggedOut(page, "16:30");

  await expect(page.getByRole("heading", { level: 1, name: "Olá, Cliente!" })).toBeVisible();
  await expect(page.getByText("Esse horário não está mais disponível. Escolha outro.")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Confirmar reserva" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: new RegExp(`^${fridayLabel}`) })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "16:30, ocupado" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Escolha um horário" })).toBeDisabled();
  await expectResumeCleared(page);
});

test("sem sessionStorage (bloqueado) o login segue e a home abre sem erro", async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get: () => {
        throw new DOMException("Bloqueado", "SecurityError");
      },
    });
  });
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  const callbackUrls = await fakeGoogleLogin(page, context);
  await chooseSlotLoggedOut(page, "15:30");

  await expect(page.getByRole("heading", { level: 1, name: "Olá, Cliente!" })).toBeVisible();
  expect(callbackUrls).toEqual(["/?resume=1"]);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Escolha um horário" })).toBeDisabled();
  await expect(page.getByRole("dialog", { name: "Confirmar reserva" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

const bookingAt = async (date: Date) => {
  const db = testDb();
  try {
    return await db.booking.findFirst({ where: { barbershopId: barbershop.id, date } });
  } finally {
    await db.$disconnect();
  }
};
