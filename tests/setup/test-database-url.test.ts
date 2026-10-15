import { describe, expect, it } from "vitest";
import { resolveTestDatabaseUrl } from "./test-database-url";

describe("resolveTestDatabaseUrl", () => {
  it("sem TEST_DATABASE_URL devolve null (integração pulada)", () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: "postgresql://u:p@dev.neon.tech/db" })).toBeNull();
  });

  it("recusa o banco de produção (Supabase)", () => {
    expect(() =>
      resolveTestDatabaseUrl({ TEST_DATABASE_URL: "postgres://u:p@aws-0-us-west-1.pooler.supabase.com:5432/postgres" }),
    ).toThrow(/produção/);
  });

  it("recusa o mesmo host do DATABASE_URL", () => {
    expect(() =>
      resolveTestDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@dev.neon.tech/db",
        TEST_DATABASE_URL: "postgresql://u:p@dev.neon.tech/db",
      }),
    ).toThrow(/mesmo host/);
  });

  it("aceita um banco separado", () => {
    expect(
      resolveTestDatabaseUrl({
        DATABASE_URL: "postgresql://u:p@dev.neon.tech/db",
        TEST_DATABASE_URL: "postgresql://u:p@testes.neon.tech/db",
      }),
    ).toBe("postgresql://u:p@testes.neon.tech/db");
  });
});
