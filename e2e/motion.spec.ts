import { expect, Locator, Page, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { E2E, testDb } from "./db";
import { atSaoPauloTime, futureWednesdayNoon, gotoLoggedIn, loginAs } from "./helpers";

// Microinterações (Prompt 21). e2e com MOTION=admin: o admin vê as animações e o cliente comum não.
// Nada aqui depende do tempo das animações: confere o atributo no <html>, as classes e o
// animation-name calculado (que continua valendo depois que a animação termina).
// Usa só o sábado às 12:30 (bloqueio), 13:30 (reserva pela home) e 14:30 (cancelamento no /adm).
const { barbershop, service, clienteA, admin } = FIXTURES;
const { clienteC } = E2E;

const saturday = (() => {
  const date = futureWednesdayNoon();
  date.setUTCDate(date.getUTCDate() + 3);
  return date;
})();
const saturdayLabel = `Sáb ${saturday.getUTCDate()}`;
const MY_SLOTS = ["12:30", "13:30", "14:30"].map((time) => atSaoPauloTime(saturday, time));

const cleanUp = async () => {
  const db = testDb();
  try {
    await db.slotBlock.deleteMany({ where: { date: { in: MY_SLOTS } } });
    await db.booking.deleteMany({ where: { barbershopId: barbershop.id, date: { in: MY_SLOTS } } });
  } finally {
    await db.$disconnect();
  }
};

test.beforeEach(cleanUp);
test.afterAll(cleanUp);

const animationName = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).animationName);

const motionAttribute = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-motion"));

// Segura a próxima Server Action até `release()`: dá para ver o estado de carregando sem depender de tempo.
const holdNextServerAction = async (page: Page) => {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await released;
    }
    await route.continue();
  });
  return release;
};

// Reserva o sábado às 13:30 pela home nova (2 serviços: CTA → Sheet → confirmar).
const bookSaturday1330 = async (page: Page) => {
  await page.getByRole("button", { name: new RegExp(`^${saturdayLabel}`) }).click();
  await page.getByRole("button", { name: "13:30", exact: true }).click();
  await page.getByRole("button", { name: `Reservar ${saturdayLabel} às 13:30` }).click();
  const sheet = page.getByRole("dialog", { name: "Confirmar reserva" });
  const release = await holdNextServerAction(page);
  await sheet.getByRole("button", { name: "Confirmar reserva" }).click();
  return { sheet, release };
};

const successCard = (page: Page) =>
  page.getByTestId("booking-success-live").getByRole("region", { name: `Reservado! ${saturdayLabel} às 13:30.` });

test("admin com MOTION: grade entra ao trocar o dia, horário faz pop, carregando com aria-busy e ✓ no sucesso", async ({
  page,
  context,
}) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);
  await expect.poll(() => motionAttribute(page)).toBe("on");

  // Primeiro carregamento: a grade não anima (não mexe no LCP).
  const panel = page.getByTestId("slots-panel");
  await expect(panel).not.toHaveClass(/animate-slots-in/);
  expect(await animationName(panel)).toBe("none");

  const { sheet, release } = await bookSaturday1330(page);

  // Trocou o dia: a grade entrou com a animação; o horário escolhido fez o pop.
  await expect(panel).toHaveClass(/animate-slots-in/);
  expect(await animationName(panel)).toBe("slots-in");

  // Carregando (a action está segura): aria-busy, desabilitado e "Reservando…".
  const busy = sheet.getByRole("button", { name: "Reservando…" });
  await expect(busy).toHaveAttribute("aria-busy", "true");
  await expect(busy).toBeDisabled();
  release();

  // Sucesso: o cartão entra dentro da área aria-live com o ✓ desenhado.
  const card = successCard(page);
  await expect(card).toBeVisible();
  expect(await animationName(card)).toBe("card-in");
  const check = card.getByTestId("success-check");
  await expect(check).toBeVisible();
  expect(await animationName(check.locator("path"))).toBe("check-draw");
});

test("admin com MOTION: o horário escolhido faz pop e os botões afundam no toque", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);
  await expect.poll(() => motionAttribute(page)).toBe("on");

  await page.getByRole("button", { name: new RegExp(`^${saturdayLabel}`) }).click();
  const slot = page.getByRole("button", { name: "13:30", exact: true });
  await slot.click();
  await expect(slot).toHaveAttribute("aria-pressed", "true");
  expect(await animationName(slot)).toBe("pop");

  // :active com scale(.97): a regra existe para os botões quando a flag está ligada.
  const pressRule = await page.evaluate(() =>
    Array.from(document.styleSheets).some((sheet) => {
      try {
        return Array.from(sheet.cssRules).some((rule) => rule.cssText.includes('html[data-motion="on"] button:not(:disabled):active'));
      } catch {
        return false;
      }
    }),
  );
  expect(pressRule).toBe(true);
});

test("cliente comum (MOTION=admin): sem data-motion e nenhuma animação", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/", clienteA.id);
  expect(await motionAttribute(page)).toBeNull();

  await page.getByRole("button", { name: new RegExp(`^${saturdayLabel}`) }).click();
  expect(await animationName(page.getByTestId("slots-panel"))).toBe("none");
  const slot = page.getByRole("button", { name: "13:30", exact: true });
  await slot.click();
  await expect(slot).toHaveAttribute("aria-pressed", "true");
  expect(await animationName(slot)).toBe("none");
});

test("reduzir movimento: com MOTION ligada, nada anima e a reserva funciona igual", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/", admin.id);
  await expect.poll(() => motionAttribute(page)).toBe("on");

  // Trocar o dia e escolher o horário: sem animação (conferido antes de abrir o Sheet, que esconde a página).
  await page.getByRole("button", { name: new RegExp(`^${saturdayLabel}`) }).click();
  expect(await animationName(page.getByTestId("slots-panel"))).toBe("none");
  const slot = page.getByRole("button", { name: "13:30", exact: true });
  await slot.click();
  await expect(slot).toHaveAttribute("aria-pressed", "true");
  expect(await animationName(slot)).toBe("none");

  const { sheet, release } = await bookSaturday1330(page);

  await expect(sheet.getByRole("button", { name: "Reservando…" })).toHaveAttribute("aria-busy", "true");
  release();

  // Estado final direto: cartão e ✓ visíveis, sem animação.
  const card = successCard(page);
  await expect(card).toBeVisible();
  expect(await animationName(card)).toBe("none");
  expect(await animationName(card.getByTestId("success-check").locator("path"))).toBe("none");
});

const openAdminSaturday = async (page: Page) => {
  await gotoLoggedIn(page, "/adm", admin.id);
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible();
  await expect.poll(() => motionAttribute(page)).toBe("on");
  await page.getByRole("button", { name: new RegExp(`^${saturdayLabel}`) }).click();
  const list = page.getByRole("list", { name: `Horários de ${saturdayLabel}` });
  return (time: string) => list.getByRole("listitem").filter({ hasText: new RegExp(`^${time}`) });
};

test("/adm com MOTION: bloquear troca a cor da linha e anima o status; toast em 240ms", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);
  const row = await openAdminSaturday(page);

  // Ao abrir: nenhuma linha anima.
  const freeRow = row("12:30");
  await expect(freeRow).toHaveAttribute("data-state", "free");
  const freeBackground = await freeRow.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await animationName(freeRow.getByTestId("slot-status"))).toBe("none");

  // Bloquear: estado e cor mudam; o status entra com a animação; o toast usa a transição de 240ms.
  await freeRow.getByRole("button", { name: "Bloquear 12:30" }).click();
  await page.getByRole("dialog", { name: `Bloquear ${saturdayLabel} às 12:30` }).getByRole("button", { name: "Bloquear" }).click();
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Horário 12:30 bloqueado." });
  await expect(toast).toBeVisible();
  expect(await toast.evaluate((el) => getComputedStyle(el).transitionDuration)).toContain("0.24s");
  const blockedRow = row("12:30");
  await expect(blockedRow).toHaveAttribute("data-state", "blocked");
  await expect.poll(() => blockedRow.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(freeBackground);
  expect(await animationName(blockedRow.getByTestId("slot-status"))).toBe("status-in");
});

test("/adm com MOTION: cancelar faz o número de Canceladas dar o pulinho", async ({ page, context }) => {
  const db = testDb();
  try {
    await db.booking.create({
      data: { userId: clienteC.id, serviceId: service.id, barbershopId: barbershop.id, date: atSaoPauloTime(saturday, "14:30") },
    });
  } finally {
    await db.$disconnect();
  }

  await loginAs(context, admin.sessionToken);
  const row = await openAdminSaturday(page);

  const canceladas = page.getByRole("region", { name: /Métricas/ }).locator("dt", { hasText: "Canceladas" }).locator("xpath=following-sibling::dd[1]");
  const number = canceladas.getByTestId("animated-number");
  await expect(number).not.toHaveClass(/animate-bump/);
  const before = Number(await canceladas.textContent());
  await row("14:30").getByRole("button", { name: "Cancelar reserva das 14:30" }).click();
  await page.getByRole("alertdialog", { name: `Cancelar reserva de ${clienteC.name}?` }).getByRole("button", { name: "Cancelar reserva" }).click();
  // O /adm re-renderizado chega depois do toast; com os dados das outras specs passa de 5s no Neon.
  await expect(canceladas).toHaveText(String(before + 1), { timeout: 15_000 });
  await expect(number).toHaveClass(/animate-bump/);
  expect(await animationName(number)).toBe("bump");
  await expect(row("14:30")).toHaveAttribute("data-state", "free");
});
