import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "vite";
import { resolveTestDatabaseUrl } from "../tests/setup/test-database-url";
import { resetDatabase, seedFixtures } from "../tests/setup/fixtures";

// Banco de teste limpo + usuários com sessão pronta (sem Google).
export default async function globalSetup() {
  const url = resolveTestDatabaseUrl({ ...loadEnv("test", process.cwd(), ""), ...process.env });
  if (!url) {
    throw new Error("TEST_DATABASE_URL ausente.");
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await resetDatabase(db);
    await seedFixtures(db);
  } finally {
    await db.$disconnect();
  }
}
