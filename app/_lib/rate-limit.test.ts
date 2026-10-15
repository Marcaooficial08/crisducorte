import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("permite 10 tentativas e bloqueia a 11ª no mesmo minuto", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("save:user-1", 10, 60_000, now + i)).toBe(true);
    }
    expect(checkRateLimit("save:user-1", 10, 60_000, now + 10)).toBe(false);
  });

  it("libera de novo depois de 1 minuto", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      checkRateLimit("save:user-1", 10, 60_000, now);
    }
    expect(checkRateLimit("save:user-1", 10, 60_000, now + 59_999)).toBe(false);
    expect(checkRateLimit("save:user-1", 10, 60_000, now + 60_000)).toBe(true);
  });

  it("conta cada chave separadamente", () => {
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      checkRateLimit("save:user-1", 10, 60_000, now);
    }
    expect(checkRateLimit("save:user-2", 10, 60_000, now)).toBe(true);
    expect(checkRateLimit("cancel:user-1", 10, 60_000, now)).toBe(true);
  });
});
