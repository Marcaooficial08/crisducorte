import { expect, Locator, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { futureWednesdayNoon, gotoLoggedIn, loginAs } from "./helpers";

const { clienteA } = FIXTURES;

const expectTouchTarget = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
};

test("botões só de ícone têm nome acessível e 44px", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  // Espera hidratar e carregar a sessão: antes disso o clique no menu se perde e o menu mostra o login.
  await gotoLoggedIn(page, "/", clienteA.id);

  const menu = page.getByRole("button", { name: "Abrir menu" });
  await expectTouchTarget(menu);

  await menu.click();
  const sair = page.getByRole("dialog").getByRole("button", { name: "Sair" });
  await expect(sair).toBeVisible();
  await expectTouchTarget(sair);
  await expectTouchTarget(page.getByRole("dialog").getByRole("button", { name: "Fechar" }));
});

// Antes na /barbershop/[id] (calendário); desde o Prompt 22 a reserva é toda na home.
test("dias e horários da home com 44px cabem em 390px sem rolagem horizontal", async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(context, clienteA.sessionToken);

  const friday = futureWednesdayNoon();
  friday.setUTCDate(friday.getUTCDate() + 2);

  await gotoLoggedIn(page, "/", clienteA.id);

  const day = page.getByRole("button", { name: new RegExp(`^Sex ${friday.getUTCDate()}`) });
  await expectTouchTarget(day);
  await day.click();

  // 19:30: nenhum outro teste reserva esse horário.
  const hour = page.getByRole("button", { name: "19:30", exact: true });
  await expectTouchTarget(hour);
  await hour.click();
  await expectTouchTarget(page.getByRole("button", { name: `Reservar Sex ${friday.getUTCDate()} às 19:30` }));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
