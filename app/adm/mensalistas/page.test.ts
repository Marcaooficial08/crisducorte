import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getMensalistas: vi.fn(),
  findBarbershop: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({ db: { barbershop: { findFirst: mocks.findBarbershop } } }));
vi.mock("@/app/_lib/mensalistas", () => ({ getMensalistas: mocks.getMensalistas }));
vi.mock("@/app/_components/header", () => ({ default: () => null }));
vi.mock("../_components/mensalistas-panel", () => ({ default: () => null }));

import MensalistasPage from "./page";

const sessionOf = (isAdmin: boolean) => ({
  user: { id: "u1", name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("/adm/mensalistas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMensalistas.mockResolvedValue([]);
    mocks.findBarbershop.mockResolvedValue({ services: [] });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem sessão e conta comum voltam para a home sem ler mensalistas", async () => {
    vi.stubEnv("MENSALISTAS", "all");
    mocks.getServerSession.mockResolvedValueOnce(null);
    await expect(MensalistasPage()).rejects.toThrow("NEXT_REDIRECT:/");
    mocks.getServerSession.mockResolvedValueOnce(sessionOf(false));
    await expect(MensalistasPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.getMensalistas).not.toHaveBeenCalled();
  });

  it("flag desligada: admin volta para o /adm", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(true));
    await expect(MensalistasPage()).rejects.toThrow("NEXT_REDIRECT:/adm");
    expect(mocks.getMensalistas).not.toHaveBeenCalled();
  });

  it("flag ligada: admin vê a lista", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(true));
    vi.stubEnv("MENSALISTAS", "admin");
    await expect(MensalistasPage()).resolves.toBeTruthy();
    expect(mocks.getMensalistas).toHaveBeenCalledTimes(1);
  });
});
