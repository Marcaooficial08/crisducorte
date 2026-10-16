import { expect, test } from "@playwright/test";

test("header e rodapé mostram a marca Cris du Corte", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Cris du Corte");
  await expect(page.getByRole("link", { name: "Cris du Corte — início" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Olá, vamos agendar um corte?" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText(`© ${new Date().getFullYear()} Cris du Corte`);
  await expect(page.getByText("5,0")).toHaveCount(0);
});
