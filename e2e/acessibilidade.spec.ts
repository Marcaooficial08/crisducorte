import { expect, Locator, Page, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { futureWednesdayNoon, gotoLoggedIn, loginAs } from "./helpers";

const { clienteA, admin } = FIXTURES;

// axe-core (Prompt 22): WCAG 2.1 A/AA nas telas que não tinham medição (pendência do Prompt 17).
const AXE_PATH = require.resolve("axe-core/axe.min.js");

const axeViolations = async (page: Page) => {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (context: Document, options: object) => Promise<{ violations: { id: string; nodes: { target: unknown }[] }[] }> } }).axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => JSON.stringify(node.target)).join(", ")}`);
  });
};

// Espera as transições/animações finitas da página (Sheet abrindo, botão voltando do toque):
// medir no meio de um transform dá 43,99… em vez de 44.
const settle = (locator: Locator) =>
  locator.page().evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.then(() => undefined, () => undefined)),
    ).then(() => undefined),
  );

const expectTouchTarget = async (locator: Locator) => {
  await settle(locator);
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

const AXE_PAGES: { path: string; as: "anon" | "cliente" | "admin"; ready: string }[] = [
  { path: "/", as: "anon", ready: "Escolha o dia" },
  { path: "/privacidade", as: "anon", ready: "Política de Privacidade" },
  { path: "/bookings", as: "cliente", ready: "Agendamentos" },
  { path: "/perfil", as: "cliente", ready: "Perfil" },
  { path: "/adm", as: "admin", ready: "Agenda" },
  { path: "/adm/mensalistas", as: "admin", ready: "Mensalistas" },
];

for (const { path, as, ready } of AXE_PAGES) {
  test(`axe (WCAG 2.1 AA) sem violações em ${path} (${as})`, async ({ page, context }) => {
    if (as === "anon") {
      await page.goto(path);
    } else {
      const user = as === "admin" ? admin : clienteA;
      await loginAs(context, user.sessionToken);
      await gotoLoggedIn(page, path, user.id);
    }
    await expect(page.getByRole("heading", { name: ready }).first()).toBeVisible();
    expect(await axeViolations(page)).toEqual([]);
  });
}
