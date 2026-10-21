import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn(), update: vi.fn(), updateMany: vi.fn() }));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({ db: { user: { update: mocks.update, updateMany: mocks.updateMany } } }));

import { setEmailReminders, unsubscribeReminders } from "./set-email-reminders";
import { unsubscribeToken } from "@/app/_lib/notifications/unsubscribe-token";
import { resetRateLimit } from "@/app/_lib/rate-limit";

const sessionOf = (id: string) => ({
  user: { id, name: "Teste", email: `${id}@example.com`, isAdmin: false },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("lembretes por e-mail (opt-out)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.stubEnv("NEXTAUTH_SECRET", "segredo-de-teste");
    mocks.update.mockResolvedValue({});
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("switch: recusa sem sessão", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    await expect(setEmailReminders(false)).rejects.toThrow("Não autenticado.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("switch: grava só no usuário da sessão", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));
    await expect(setEmailReminders(false)).resolves.toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "cliente-a" }, data: { emailReminders: false } });
  });

  it("switch: valor que não é booleano é recusado", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));
    await expect(setEmailReminders("false" as unknown as boolean)).resolves.toEqual({ success: false, error: "Dados inválidos." });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("link do e-mail: desliga com token válido, recusa token de outro usuário", async () => {
    await expect(unsubscribeReminders({ userId: "cliente-a", token: unsubscribeToken("cliente-b") })).resolves.toEqual({ success: false });
    expect(mocks.updateMany).not.toHaveBeenCalled();

    await expect(unsubscribeReminders({ userId: "cliente-a", token: unsubscribeToken("cliente-a") })).resolves.toEqual({ success: true });
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: "cliente-a" }, data: { emailReminders: false } });
  });
});
