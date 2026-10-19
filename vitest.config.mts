import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { resolveTestDatabaseUrl } from "./tests/setup/test-database-url";

const env = { ...loadEnv("test", process.cwd(), ""), ...process.env };
const testDatabaseUrl = resolveTestDatabaseUrl(env);

if (!testDatabaseUrl) {
  console.warn("⚠ TEST_DATABASE_URL ausente: testes de integração pulados.");
}

// Flags fixas em off: os testes não dependem do .env local (cada teste liga a sua com vi.stubEnv).
const FLAGS_OFF = { AGENDA_V2: "off", NEW_HOME: "off", ADMIN_PANEL_V2: "off" };

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
          env: FLAGS_OFF,
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
                env: { ...FLAGS_OFF, DATABASE_URL: testDatabaseUrl },
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
