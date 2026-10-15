import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findMany: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({ db: { booking: { findMany: mocks.findMany } } }));
vi.mock("@/app/_components/header", () => ({ default: () => null }));
vi.mock("@/app/_components/booking-item-adm", () => ({ default: () => null }));

import BookingsPageAdm from "./page";

const sessionOf = (isAdmin: boolean) => ({
  user: { id: "u1", name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("/adm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it("sem sessão volta para a home sem ler reservas", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(BookingsPageAdm()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("conta comum volta para a home sem ler reservas", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(false));

    await expect(BookingsPageAdm()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("admin abre a página e vê todas as reservas", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(true));

    await expect(BookingsPageAdm()).resolves.toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ where: expect.objectContaining({ userId: expect.anything() }) }),
    );
  });
});
