import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/_lib/prisma", () => ({ db: {} }));

import { redactError } from "./log";

describe("NotificationLog", () => {
  it("erro do SMTP sem e-mail (LGPD) e curto", () => {
    expect(redactError(new Error("550 5.1.1 <joao.silva@gmail.com>: user unknown"))).toBe("550 5.1.1 <<e-mail>>: user unknown");
    expect(redactError("falhou para ana@x.com e bia@y.com.br")).toBe("falhou para <e-mail> e <e-mail>");
    expect(redactError(new Error("x".repeat(500)))).toHaveLength(300);
  });
});
