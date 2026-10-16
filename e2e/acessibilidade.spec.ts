import { expect, Locator, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { futureWednesdayNoon, loginAs } from "./helpers";

const { barbershop, clienteA } = FIXTURES;

const expectTouchTarget = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
};

test("botões só de ícone têm nome acessível e 44px", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  await page.goto(`/barbershop/${barbershop.id}`);

  await expectTouchTarget(page.getByRole("button", { name: "Voltar" }));
  const menu = page.getByRole("button", { name: "Abrir menu" });
  await expectTouchTarget(menu);

  await menu.click();
  const sair = page.getByRole("dialog").getByRole("button", { name: "Sair" });
  await expect(sair).toBeVisible();
  await expectTouchTarget(sair);
  await expectTouchTarget(page.getByRole("dialog").getByRole("button", { name: "Fechar" }));
});

test("calendário e horários com 44px cabem em 390px sem rolagem horizontal", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(context, clienteA.sessionToken);

  const wednesday = futureWednesdayNoon();
  await page.clock.setFixedTime(wednesday);
  const friday = new Date(wednesday);
  friday.setUTCDate(friday.getUTCDate() + 2);

  const sessionLoaded = page.waitForResponse(
    async (res) => res.url().endsWith("/api/auth/session") && (await res.json())?.user?.id === clienteA.id,
  );
  await page.goto(`/barbershop/${barbershop.id}`);
  await sessionLoaded;
  await page.getByRole("button", { name: "Reservar" }).first().click();

  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Fazer Reserva")).toBeVisible();

  const next = sheet.getByRole("button", { name: "Go to next month" });
  await expectTouchTarget(next);
  const previous = sheet.getByRole("button", { name: "Go to previous month" });
  await expectTouchTarget(previous);
  // As setas ficam nos cantos, sem esticar por cima do nome do mês.
  const [prevBox, nextBox] = [await previous.boundingBox(), await next.boundingBox()];
  expect(prevBox!.x + prevBox!.width).toBeLessThan(nextBox!.x - 100);
  if (friday.getUTCMonth() !== wednesday.getUTCMonth()) {
    await next.click();
  }

  const day = sheet.getByRole("gridcell", { name: String(friday.getUTCDate()), exact: true, disabled: false });
  await expectTouchTarget(day);
  await day.click();

  const hour = sheet.getByRole("button", { name: "10:30" });
  await expectTouchTarget(hour);
  await hour.click();

  const overflow = await sheet.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
