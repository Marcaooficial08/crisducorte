import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { resolveTestDatabaseUrl } from "./tests/setup/test-database-url";

const env = { ...loadEnv("test", process.cwd(), ""), ...process.env };
const testDatabaseUrl = resolveTestDatabaseUrl(env);

if (!testDatabaseUrl) {
  console.warn("⚠ TEST_DATABASE_URL ausente: testes de integração pulados.");
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["app/**/*.test.ts", "tests/setup/**/*.test.ts"],
        },
      },
      ...(testDatabaseUrl
        ? [
            {
              extends: true,
              test: {
                name: "integration",
                environment: "node",
                include: ["tests/integration/**/*.int.test.ts"],
                env: { DATABASE_URL: testDatabaseUrl },
                globalSetup: ["tests/setup/integration-global-setup.ts"],
                fileParallelism: false,
                testTimeout: 30_000,
                hookTimeout: 60_000,
              },
            },
          ]
        : []),
    ],
  },
});
