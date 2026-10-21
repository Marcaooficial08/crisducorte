import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findMany: vi.fn(),
  findBarbershop: vi.fn(),
  getBookingMetrics: vi.fn(),
  getAdminAgenda: vi.fn(),
  countPendingRenewals: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({
  db: { booking: { findMany: mocks.findMany }, barbershop: { findFirst: mocks.findBarbershop } },
}));
vi.mock("@/app/_lib/metrics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_lib/metrics")>()),
  getBookingMetrics: mocks.getBookingMetrics,
}));
vi.mock("@/app/_lib/admin-agenda", () => ({ getAdminAgenda: mocks.getAdminAgenda }));
vi.mock("@/app/_lib/mensalistas", () => ({ countPendingRenewals: mocks.countPendingRenewals }));
vi.mock("@/app/_components/header", () => ({ default: () => null }));
vi.mock("@/app/_components/booking-item-adm", () => ({ default: () => null }));
vi.mock("./_components/admin-agenda", () => ({ default: () => null }));

import BookingsPageAdm from "./page";

const sessionOf = (isAdmin: boolean) => ({
  user: { id: "u1", name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("/adm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.findBarbershop.mockResolvedValue({ id: "shop-1", services: [{ id: "s1", name: "Corte" }] });
    mocks.getBookingMetrics.mockResolvedValue({ confirmadas: 0, canceladas: 0, porSemana: [] });
    mocks.getAdminAgenda.mockResolvedValue([]);
    mocks.countPendingRenewals.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem sessão volta para a home sem ler reservas", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(BookingsPageAdm()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.getBookingMetrics).not.toHaveBeenCalled();
  });

  it("conta comum volta para a home sem ler reservas nem métricas", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(false));
    vi.stubEnv("ADMIN_PANEL_V2", "all");

    await expect(BookingsPageAdm()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.getBookingMetrics).not.toHaveBeenCalled();
    expect(mocks.getAdminAgenda).not.toHaveBeenCalled();
  });

  it("admin abre a página e vê todas as reservas", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(true));

    await expect(BookingsPageAdm()).resolves.toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ where: expect.objectContaining({ userId: expect.anything() }) }),
    );
  });

  it("ADMIN_PANEL_V2 off: lista antiga + métricas, sem a grade", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(true));

    await BookingsPageAdm();

    expect(mocks.getBookingMetrics).toHaveBeenCalledTimes(1);
    expect(mocks.getAdminAgenda).not.toHaveBeenCalled();
  });

  it("ADMIN_PANEL_V2 ligada: grade da semana aberta da barbearia + métricas de 5 semanas", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(true));
    vi.stubEnv("ADMIN_PANEL_V2", "admin");

    await BookingsPageAdm();

    expect(mocks.getAdminAgenda).toHaveBeenCalledWith("shop-1", expect.any(Date));
    const [desde, ate] = mocks.getBookingMetrics.mock.calls[0] as [Date, Date];
    expect(Math.round((ate.getTime() - desde.getTime()) / (24 * 60 * 60 * 1000))).toBe(35);
  });

  it("MENSALISTAS: off não conta renovações; ligada conta para o badge da aba", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf(true));
    await BookingsPageAdm();
    expect(mocks.countPendingRenewals).not.toHaveBeenCalled();

    vi.stubEnv("MENSALISTAS", "admin");
    await BookingsPageAdm();
    expect(mocks.countPendingRenewals).toHaveBeenCalledTimes(1);
  });
});
