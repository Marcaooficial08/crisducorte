import { execSync } from "node:child_process";
import { FullConfig } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "vite";
import { resolveTestDatabaseUrl } from "../tests/setup/test-database-url";
import { FIXTURES, resetDatabase, seedFixtures } from "../tests/setup/fixtures";
import { seedE2eFixtures } from "./db";

// Banco de teste limpo + usuários com sessão pronta (sem Google).
export default async function globalSetup(config: FullConfig) {
  const url = resolveTestDatabaseUrl({ ...loadEnv("test", process.cwd(), ""), ...process.env });
  if (!url) {
    throw new Error("TEST_DATABASE_URL ausente.");
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await resetDatabase(db);
    await seedFixtures(db);
    await seedE2eFixtures(db);
  } finally {
    await db.$disconnect();
  }

  await warmUpServer(config.projects[0].use.baseURL);
}

// O webServer já está no ar aqui. A primeira visita carrega os módulos das rotas e abre a conexão
// do Prisma com o banco (TLS até o Neon, local); sem isso, o primeiro teste paga esse custo.
const warmUpServer = async (baseURL: string | undefined) => {
  if (!baseURL) {
    return;
  }
  const asUser = (token: string) => ({ headers: { cookie: `next-auth.session-token=${token}` } });
  const { clienteA, admin } = FIXTURES;
  await fetch(`${baseURL}/`);
  await Promise.all([
    fetch(`${baseURL}/perfil`, asUser(clienteA.sessionToken)),
    fetch(`${baseURL}/api/auth/session`, asUser(clienteA.sessionToken)),
    fetch(`${baseURL}/bookings`, asUser(clienteA.sessionToken)),
    fetch(`${baseURL}/adm`, asUser(admin.sessionToken)),
  ]);
};
