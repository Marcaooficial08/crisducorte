import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }));

// Sessão simulada; banco real (TEST_DATABASE_URL).
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: () => ({ delete: vi.fn() }) }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { ADMIN_DELETE_MESSAGE } from "@/app/_lib/auth-guards";
import { deleteAccount } from "@/app/_actions/delete-account";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA, clienteB, admin } = FIXTURES;

const sessionOf = (user: { id: string; name: string; email: string }, isAdmin = false) => ({
  user: { ...user, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const PAST = new Date("2020-01-03T13:30:00.000Z");
const FUTURE = new Date("2030-01-04T13:30:00.000Z");
const FUTURE_2 = new Date("2030-01-04T14:30:00.000Z");

const bookingFor = (userId: string, date: Date) =>
  db.booking.create({ data: { userId, date, barbershopId: barbershop.id, serviceId: service.id } });

describe("excluir conta no banco real", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimit();
    await resetDatabase(db);
    await seedFixtures(db);
    await db.account.create({
      data: { userId: clienteA.id, type: "oauth", provider: "google", providerAccountId: "google-cliente-a" },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("cliente exclui a própria conta e some do banco", async () => {
    const past = await bookingFor(clienteA.id, PAST);
    await bookingFor(clienteA.id, FUTURE);
    const otherClient = await bookingFor(clienteB.id, FUTURE_2);

    mocks.getServerSession.mockResolvedValueOnce(sessionOf(clienteA));
    await expect(deleteAccount()).resolves.toEqual({ success: true });

    // Nenhum dado pessoal do cliente A sobra.
    expect(await db.user.findUnique({ where: { id: clienteA.id } })).toBeNull();
    expect(await db.user.findUnique({ where: { email: clienteA.email } })).toBeNull();
    expect(await db.account.count({ where: { userId: clienteA.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: clienteA.id } })).toBe(0);
    expect(await db.booking.count({ where: { userId: clienteA.id } })).toBe(0);

    // Reserva futura cancelada; passada fica no histórico sem dono.
    expect(await db.booking.findFirst({ where: { date: FUTURE } })).toBeNull();
    expect(await db.booking.findUnique({ where: { id: past.id } })).toMatchObject({ userId: null, date: PAST });

    // Outros clientes não são afetados.
    expect(await db.user.findUnique({ where: { id: clienteB.id } })).not.toBeNull();
    expect(await db.session.count({ where: { userId: clienteB.id } })).toBe(1);
    expect(await db.booking.findUnique({ where: { id: otherClient.id } })).toMatchObject({ userId: clienteB.id });
  });

  it("admin não consegue excluir a conta pelo app", async () => {
    await bookingFor(admin.id, FUTURE);

    mocks.getServerSession.mockResolvedValueOnce(sessionOf(admin, true));
    await expect(deleteAccount()).resolves.toEqual({ success: false, error: ADMIN_DELETE_MESSAGE });

    expect(await db.user.findUnique({ where: { id: admin.id } })).not.toBeNull();
    expect(await db.session.count({ where: { userId: admin.id } })).toBe(1);
    expect(await db.booking.count({ where: { userId: admin.id } })).toBe(1);
  });
});
