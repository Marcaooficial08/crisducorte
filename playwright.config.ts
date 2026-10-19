import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";
import { resolveTestDatabaseUrl } from "./tests/setup/test-database-url";
import { futureWednesdayNoon } from "./e2e/helpers";

const testDatabaseUrl = resolveTestDatabaseUrl({ ...loadEnv("test", process.cwd(), ""), ...process.env });
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL ausente: o e2e precisa de um banco só de testes.");
}

const PORT = 3100;
export const BASE_URL = `http://localhost:${PORT}`;

// Roda contra o build de produção (`npm run build` antes) com o banco de teste.
// O login do Google é simulado pelo cookie de sessão (ver e2e/global-setup.ts).
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      NEXTAUTH_URL: BASE_URL,
      NEXTAUTH_SECRET: "e2e-secret-nao-usar-em-producao",
      GOOGLE_CLIENT_ID: "e2e-google-client-id",
      GOOGLE_CLIENT_SECRET: "e2e-google-client-secret",
      // O `next start` também lê o .env local; fixa a flag para o e2e dar igual local e no CI.
      AGENDA_V2: "off",
      // Home nova para todos, como em produção desde 2026-10-17; a antiga continua em /classic.
      NEW_HOME: "all",
      // Painel do admin novo (grade, bloqueios, reserva manual).
      ADMIN_PANEL_V2: "admin",
      // Relógio fixo do servidor (getNow): a mesma quarta futura que o page.clock usa no navegador.
      E2E: "1",
      SCHEDULE_NOW: futureWednesdayNoon().toISOString(),
    },
  },
});
