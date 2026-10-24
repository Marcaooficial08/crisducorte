import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }));

// Sessão simulada; banco real (TEST_DATABASE_URL).
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { getBookingMetrics } from "@/app/_lib/metrics";
import { cancelBooking } from "@/app/_actions/cancel-booking";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA, clienteB, admin } = FIXTURES;

const slot = new Date("2030-01-04T13:30:00.000Z");

const sessionOf = (user: { id: string; name: string; email: string }, isAdmin = false) => ({
  user: { ...user, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const as = <T>(user: Parameters<typeof sessionOf>[0], fn: () => Promise<T>, isAdmin = false) => {
  mocks.getServerSession.mockResolvedValueOnce(sessionOf(user, isAdmin));
  return fn();
};

const createBooking = (data: { userId?: string | null; source?: "CLIENT" | "MANUAL"; customerName?: string } = {}) =>
  db.booking.create({
    data: { barbershopId: barbershop.id, serviceId: service.id, date: slot, userId: clienteA.id, ...data },
  });

describe("registro de cancelamento (banco real)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimit();
    await resetDatabase(db);
    await seedFixtures(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("reserva nova nasce com source CLIENT pelo default", async () => {
    const booking = await createBooking();
    expect(booking.source).toBe("CLIENT");
  });

  it("cliente cancela a própria: apaga a reserva e grava 1 linha com byAdmin false", async () => {
    const booking = await createBooking();

    await expect(as(clienteA, () => cancelBooking(booking.id))).resolves.toEqual({ success: true });

    expect(await db.booking.count()).toBe(0);
    const rows = await db.bookingCancellation.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bookingId: booking.id, date: slot, byAdmin: false, source: "CLIENT" });
  });

  it("admin cancela a de outra pessoa: byAdmin true e mantém o source da reserva", async () => {
    const booking = await createBooking({ userId: null, source: "MANUAL", customerName: "João" });

    await expect(as(admin, () => cancelBooking(booking.id), true)).resolves.toEqual({ success: true });

    const rows = await db.bookingCancellation.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ bookingId: booking.id, byAdmin: true, source: "MANUAL" });
  });

  it("cancelamento recusado não grava nada", async () => {
    const booking = await createBooking();

    await expect(as(clienteB, () => cancelBooking(booking.id))).resolves.toEqual({
      success: false,
      error: "Sem permissão para cancelar esta reserva.",
    });

    expect(await db.booking.count()).toBe(1);
    expect(await db.bookingCancellation.count()).toBe(0);
  });

  // O segundo falha antes (reserva não encontrada → { success: false }) ou no delete da transação (lança);
  // nos dois casos não grava linha.
  it("dois cancelamentos simultâneos da mesma reserva: só 1 linha", async () => {
    const booking = await createBooking();
    mocks.getServerSession.mockResolvedValueOnce(sessionOf(clienteA)).mockResolvedValueOnce(sessionOf(admin, true));

    const results = await Promise.allSettled([cancelBooking(booking.id), cancelBooking(booking.id)]);

    expect(results.filter((r) => r.status === "fulfilled" && r.value.success)).toHaveLength(1);
    expect(await db.booking.count()).toBe(0);
    expect(await db.bookingCancellation.count()).toBe(1);
  });

  it("getBookingMetrics conta a cancelada", async () => {
    const booking = await createBooking();
    await db.booking.create({
      data: { barbershopId: barbershop.id, serviceId: service.id, userId: clienteB.id, date: new Date("2030-01-05T12:00:00.000Z") },
    });
    await as(clienteA, () => cancelBooking(booking.id));

    const metrics = await getBookingMetrics(new Date("2030-01-01T00:00:00Z"), new Date("2030-01-31T23:59:59Z"));

    expect(metrics).toEqual({
      confirmadas: 1,
      canceladas: 1,
      porSemana: [{ semana: "2029-12-31", total: 1, canceladas: 1 }],
    });
  });
});
