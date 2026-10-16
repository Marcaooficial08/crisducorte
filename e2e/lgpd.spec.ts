import { expect, test } from "@playwright/test";
import { FIXTURES } from "../tests/setup/fixtures";
import { loginAs } from "./helpers";

const { clienteB, admin } = FIXTURES;

test("rodapé leva à Política de Privacidade", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacidade" }).click();

  await expect(page).toHaveURL(/\/privacidade$/);
  await expect(page.getByRole("heading", { name: "Política de Privacidade" })).toBeVisible();
});

test("admin não vê o botão de excluir conta", async ({ page, context }) => {
  await loginAs(context, admin.sessionToken);

  await page.goto("/perfil");
  await expect(page.getByText("Conta de administrador não pode ser excluída por aqui")).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir minha conta" })).toHaveCount(0);
});

// Usa o cliente B: a conta deixa de existir depois deste teste.
test("cliente exclui a própria conta e perde o acesso", async ({ page, context }) => {
  await loginAs(context, clienteB.sessionToken);

  await page.goto("/perfil");
  await page.getByRole("button", { name: "Excluir minha conta" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();

  await expect(page).toHaveURL(/\/$/);

  // Sessão apagada no banco: o perfil volta para a home.
  await loginAs(context, clienteB.sessionToken);
  await page.goto("/perfil");
  await expect(page).toHaveURL(/\/$/);
});
