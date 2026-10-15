import { execSync } from "node:child_process";
import { loadEnv } from "vite";
import { resolveTestDatabaseUrl } from "./test-database-url";

// Aplica as migrações no banco de teste antes da integração.
export default function setup() {
  const url = resolveTestDatabaseUrl({ ...loadEnv("test", process.cwd(), ""), ...process.env });
  if (!url) {
    throw new Error("TEST_DATABASE_URL ausente.");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
