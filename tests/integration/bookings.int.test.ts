import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }));

// Sessão simulada; banco real (TEST_DATABASE_URL).
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { saveBooking } from "@/app/barbershop/[id]/_actions/save-booking";
import { cancelBooking } from "@/app/_actions/cancel-booking";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA, clienteB, admin } = FIXTURES;

const sessionOf = (user: { id: string; name: string; email: string }, isAdmin = false) => ({
  user: { ...user, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const slot = "2030-01-04T13:30:00.000Z";
const params = { barbershopId: barbershop.id, serviceId: service.id, date: slot };

// Chama a action como se o usuário estivesse logado.
const as = <T>(user: Parameters<typeof sessionOf>[0], fn: () => Promise<T>, isAdmin = false) => {
  mocks.getServerSession.mockResolvedValueOnce(sessionOf(user, isAdmin));
  return fn();
};

describe("reservas no banco real", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimit();
    await resetDatabase(db);
    await seedFixtures(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("reservar um horário livre funciona", async () => {
    const result = await as(clienteA, () => saveBooking(params));

    expect(result).toEqual({ success: true });
    const bookings = await db.booking.findMany();
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({ userId: clienteA.id, date: new Date(slot) });
  });

  it("dois clientes no mesmo horário ao mesmo tempo: só um consegue", async () => {
    mocks.getServerSession
      .mockResolvedValueOnce(sessionOf(clienteA))
      .mockResolvedValueOnce(sessionOf(clienteB));

    const results = await Promise.all([saveBooking(params), saveBooking(params)]);

    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success)).toEqual([
      { success: false, error: "Horário já reservado. Escolha outro." },
    ]);
    expect(await db.booking.count()).toBe(1);
  });

  it("segundo cliente no horário já reservado recebe o erro de horário tomado", async () => {
    await as(clienteA, () => saveBooking(params));
    const result = await as(clienteB, () => saveBooking(params));

    expect(result).toEqual({ success: false, error: "Horário já reservado. Escolha outro." });
  });

  it("cancelar a própria reserva funciona", async () => {
    await as(clienteA, () => saveBooking(params));
    const booking = await db.booking.findFirstOrThrow();

    await expect(as(clienteA, () => cancelBooking(booking.id))).resolves.toEqual({ success: true });
    expect(await db.booking.count()).toBe(0);
  });

  it("cancelar a reserva de outro cliente é recusado", async () => {
    await as(clienteA, () => saveBooking(params));
    const booking = await db.booking.findFirstOrThrow();

    await expect(as(clienteB, () => cancelBooking(booking.id))).rejects.toThrow(
      "Sem permissão para cancelar esta reserva.",
    );
    expect(await db.booking.count()).toBe(1);
  });

  it("admin cancela a reserva de um cliente", async () => {
    await as(clienteA, () => saveBooking(params));
    const booking = await db.booking.findFirstOrThrow();

    await expect(as(admin, () => cancelBooking(booking.id), true)).resolves.toEqual({ success: true });
    expect(await db.booking.count()).toBe(0);
  });
});
