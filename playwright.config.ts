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
  // Local o servidor fala com o Neon "Testes" pela internet (us-east-2): 10s; no CI (Postgres local), o padrão de 5s.
  expect: { timeout: process.env.CI ? 5_000 : 10_000 },
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
      // O `next start` também lê o .env local: as flags ficam fixas para o e2e dar igual local e no CI.
      // Notificações (switch do Perfil e WhatsAppButton) só para o admin, como no rollout. Sem credenciais
      // do Gmail: nada sai do e2e, mesmo que o .env local tenha SMTP_USER/SMTP_PASS.
      NOTIFICACOES: "admin",
      // Service worker e dica de instalação só para o admin, como no rollout (Prompt 20).
      PWA_INSTALL: "admin",
      // Web Push: switch do Perfil só para o admin. Só a chave pública (gerada para o e2e; a privada foi
      // descartada): o switch aparece, mas sem VAPID_PRIVATE_KEY nenhum push sai do e2e.
      WEB_PUSH: "admin",
      VAPID_PUBLIC_KEY: "BMM8W9wROJhu82APZiwpllaK79weh5eziyTMcDseT0KZU4hRZeMnrBPzOsp9uomsHq55RBYhR_vuxDU1E8ltYes",
      VAPID_PRIVATE_KEY: "",
      VAPID_SUBJECT: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      NOTIFY_ALLOWLIST: "",
      CRON_SECRET: "",
      // Relógio fixo do servidor (getNow): a mesma quarta futura que o page.clock usa no navegador.
      E2E: "1",
      SCHEDULE_NOW: futureWednesdayNoon().toISOString(),
    },
  },
});
