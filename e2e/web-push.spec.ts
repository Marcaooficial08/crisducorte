import { devices, expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { gotoLoggedIn, loginAs } from "./helpers";

// e2e roda com WEB_PUSH=admin e só a chave pública VAPID (nenhum push sai). A inscrição real depende do
// serviço de push do navegador (FCM/Apple), fora do e2e: aqui ficam a tela, o SW e a Política.
const { clienteA, admin } = FIXTURES;
const PRIVACY_PUSH = "Se você ativar as notificações no celular, guardamos o endereço técnico de entrega";

test("admin vê o switch 'Notificações no celular' desligado, com alvo de 44px", async ({ page, context }) => {
  // O Chromium headless do e2e sempre responde "denied" (estado "bloqueadas", testado abaixo):
  // simula um navegador que ainda não perguntou.
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { get: () => "default" });
  });
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/perfil", admin.id);

  const toggle = page.getByRole("switch", { name: /Notificações no celular/ });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(toggle).toBeEnabled();
  await expect(toggle).toContainText("Lembrete na véspera e aviso se o Cris cancelar.");
  expect((await toggle.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("admin com notificações bloqueadas no navegador: switch desabilitado com a explicação", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { get: () => "denied" });
  });
  await gotoLoggedIn(page, "/perfil", admin.id);

  const toggle = page.getByRole("switch", { name: /Notificações no celular/ });
  await expect(toggle).toBeDisabled();
  await expect(toggle).toContainText("As notificações estão bloqueadas. Libere nas configurações do navegador para este site.");
});

test("cliente comum (flag só para o admin): sem switch e sem o parágrafo na Política", async ({ page, context }) => {
  await loginAs(context, clienteA.sessionToken);
  await gotoLoggedIn(page, "/perfil", clienteA.id);
  await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible();
  await expect(page.getByRole("switch", { name: /Notificações no celular/ })).toHaveCount(0);

  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
  await expect(page.getByText(PRIVACY_PUSH)).toHaveCount(0);
});

test("admin vê o parágrafo do push na Política; o SW trata push e toque na notificação", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);
  await gotoLoggedIn(page, "/privacidade", admin.id);
  await expect(page.getByText(PRIVACY_PUSH)).toBeVisible();

  const script = await (await page.request.get("/sw.js")).text();
  expect(script).toContain('self.addEventListener("push"');
  expect(script).toContain('self.addEventListener("notificationclick"');
});

test.describe("iPhone", () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...iphone } = devices["iPhone 13"];
  test.use(iphone);

  test("fora do app instalado: switch desabilitado pedindo para instalar primeiro", async ({ page, context }) => {
    await loginAs(context, admin.sessionToken);
    await gotoLoggedIn(page, "/perfil", admin.id);

    const toggle = page.getByRole("switch", { name: /Notificações no celular/ });
    await expect(toggle).toBeDisabled();
    await expect(toggle).toContainText(
      "No iPhone, instale o app primeiro (Compartilhar → Adicionar à Tela de Início) e ative por ele.",
    );
  });
});
