import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  transaction: vi.fn(),
  bookingDeleteMany: vi.fn(),
  bookingUpdateMany: vi.fn(),
  sessionDeleteMany: vi.fn(),
  accountDeleteMany: vi.fn(),
  userDelete: vi.fn(),
  cookieDelete: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: () => ({ delete: mocks.cookieDelete }) }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({
  db: {
    $transaction: mocks.transaction,
    booking: { deleteMany: mocks.bookingDeleteMany, updateMany: mocks.bookingUpdateMany },
    session: { deleteMany: mocks.sessionDeleteMany },
    account: { deleteMany: mocks.accountDeleteMany },
    user: { delete: mocks.userDelete },
  },
}));

import { deleteAccount } from "./delete-account";
import { ADMIN_DELETE_MESSAGE } from "@/app/_lib/auth-guards";
import { RATE_LIMIT_MESSAGE, resetRateLimit } from "@/app/_lib/rate-limit";

const sessionOf = (id: string, isAdmin = false) => ({
  user: { id, name: "Teste", email: `${id}@example.com`, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    mocks.transaction.mockResolvedValue([]);
  });

  it("recusa sem sessão", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(deleteAccount()).rejects.toThrow("Não autenticado.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("recusa conta de administrador", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await expect(deleteAccount()).resolves.toEqual({ success: false, error: ADMIN_DELETE_MESSAGE });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.userDelete).not.toHaveBeenCalled();
    expect(mocks.cookieDelete).not.toHaveBeenCalled();
  });

  it("cliente exclui só a própria conta", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await expect(deleteAccount()).resolves.toEqual({ success: true });
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.bookingDeleteMany).toHaveBeenCalledWith({
      where: { userId: "cliente-a", date: { gte: expect.any(Date) } },
    });
    expect(mocks.bookingUpdateMany).toHaveBeenCalledWith({ where: { userId: "cliente-a" }, data: { userId: null } });
    expect(mocks.sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: "cliente-a" } });
    expect(mocks.accountDeleteMany).toHaveBeenCalledWith({ where: { userId: "cliente-a" } });
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "cliente-a" } });
    expect(mocks.cookieDelete).toHaveBeenCalledWith("next-auth.session-token");
  });

  it("aplica o rate limit", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    for (let i = 0; i < 10; i++) await deleteAccount();

    await expect(deleteAccount()).resolves.toEqual({ success: false, error: RATE_LIMIT_MESSAGE });
  });
});
