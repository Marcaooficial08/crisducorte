import { describe, expect, it, vi } from "vitest";

describe("PrismaClient singleton", () => {
  it("reaproveita o mesmo cliente em globalThis, também em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const first = (await import("./prisma")).db;
    vi.resetModules();
    const second = (await import("./prisma")).db;

    expect(second).toBe(first);
    expect(globalThis.cachedPrisma).toBe(first);
    vi.unstubAllEnvs();
  });
});
