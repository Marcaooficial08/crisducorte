import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }));

// Sessão simulada; banco real (TEST_DATABASE_URL).
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { getBookingMetrics } from "@/app/_lib/metrics";
import { getSlotStatus } from "@/app/_lib/availability";
import { ADMIN_ERROR_MESSAGES, AdminErrorCode } from "@/app/_lib/admin-actions";
import { blockSlot } from "@/app/_actions/admin/block-slot";
import { unblockSlot } from "@/app/_actions/admin/unblock-slot";
import { blockDay } from "@/app/_actions/admin/block-day";
import { unblockDay } from "@/app/_actions/admin/unblock-day";
import { createManualBooking } from "@/app/_actions/admin/create-manual-booking";
import { adminCancelBooking } from "@/app/_actions/admin/admin-cancel-booking";
import { saveBooking } from "@/app/barbershop/[id]/_actions/save-booking";
import { getDayBookings } from "@/app/barbershop/[id]/_actions/get-day-bookings";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA, clienteB, admin } = FIXTURES;

// Horário de São Paulo (UTC-3) → Date.
const sp = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

// Relógio fixo (getNow = new Date(), com fake timers): quarta 02/01/2030 12:00.
// Semana aberta: sexta 04/01 e sábado 05/01. Não depende do dia em que o teste roda.
const WEDNESDAY_NOON = sp("2030-01-02T12:00:00");
const FRIDAY = "2030-01-04";
const FRIDAY_0900 = sp("2030-01-04T09:00:00");
const FRIDAY_1030 = sp("2030-01-04T10:30:00");
const FRIDAY_1130 = sp("2030-01-04T11:30:00");

type User = { id: string; name: string; email: string };

const sessionOf = (user: User, isAdmin = false) => ({ user: { ...user, isAdmin }, expires: "2999-01-01T00:00:00.000Z" });

// A action chama getServerSession logo no início, então cada chamada consome a sua sessão.
const as = <T>(user: User, fn: () => Promise<T>, isAdmin = false) => {
  mocks.getServerSession.mockResolvedValueOnce(sessionOf(user, isAdmin));
  return fn();
};
const asAdmin = <T>(fn: () => Promise<T>) => as(admin, fn, true);

const clientBooks = (user: User, date: Date) =>
  as(user, () => saveBooking({ barbershopId: barbershop.id, serviceId: service.id, date: date.toISOString() }));

const manual = (time: string, overrides: Partial<Parameters<typeof createManualBooking>[0]> = {}) =>
  asAdmin(() =>
    createManualBooking({
      date: FRIDAY,
      time,
      serviceId: service.id,
      customerName: "João Manual",
      customerPhone: "(11) 91234-5678",
      ...overrides,
    }),
  );

const failed = (code: AdminErrorCode) => ({ success: false, code, error: ADMIN_ERROR_MESSAGES[code] });

const statusOf = (time: string) => getSlotStatus(FRIDAY, time, { barbershopId: barbershop.id });

describe("painel do admin (banco real, relógio fixo)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.stubEnv("NEW_HOME", "all");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(WEDNESDAY_NOON);
    await resetDatabase(db);
    await seedFixtures(db);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  describe("bloquear horário", () => {
    it("horário bloqueado é recusado pelo saveBooking (home nova e agenda antiga) e some da /barbershop/[id]", async () => {
      expect(await asAdmin(() => blockSlot({ date: FRIDAY, time: "09:00", reason: "Médico" }))).toEqual({
        success: true,
        message: "Horário 09:00 bloqueado.",
      });
      expect(await db.slotBlock.findMany()).toMatchObject([{ date: FRIDAY_0900, reason: "Médico" }]);
      expect(await statusOf("09:00")).toBe("BLOCKED");

      // NEW_HOME ligada (getSlotStatus) e flags desligadas (getInstantStatus).
      expect(await clientBooks(clienteA, FRIDAY_0900)).toMatchObject({ success: false, code: "SLOT_UNAVAILABLE" });
      vi.stubEnv("NEW_HOME", "off");
      expect(await clientBooks(clienteA, FRIDAY_0900)).toMatchObject({ success: false, code: "SLOT_UNAVAILABLE" });
      expect(await db.booking.count()).toBe(0);

      // /barbershop/[id]: o bloqueado vem como ocupado, só com a data.
      expect(await getDayBookings(barbershop.id, FRIDAY_0900)).toEqual([{ date: FRIDAY_0900 }]);
    });

    it("desbloquear libera o horário de novo", async () => {
      await asAdmin(() => blockSlot({ date: FRIDAY, time: "09:00" }));
      expect(await asAdmin(() => unblockSlot({ date: FRIDAY, time: "09:00" }))).toMatchObject({ success: true });

      expect(await db.slotBlock.count()).toBe(0);
      expect(await clientBooks(clienteA, FRIDAY_0900)).toEqual({ success: true });
    });

    it("horário com reserva não é bloqueado", async () => {
      await clientBooks(clienteA, FRIDAY_0900);

      expect(await asAdmin(() => blockSlot({ date: FRIDAY, time: "09:00" }))).toEqual(failed("HAS_BOOKING"));
      expect(await db.slotBlock.count()).toBe(0);
    });

    it("bloquear e reservar o mesmo horário ao mesmo tempo: só um grava (lockSlot)", async () => {
      const times = ["09:00", "10:30", "11:30", "12:30", "13:30"];
      await Promise.all(
        times.map((time) =>
          Promise.all([
            asAdmin(() => blockSlot({ date: FRIDAY, time })),
            clientBooks(clienteA, sp(`${FRIDAY}T${time}:00`)),
          ]),
        ),
      );

      for (const time of times) {
        const instant = sp(`${FRIDAY}T${time}:00`);
        const [bookings, blocks] = await Promise.all([
          db.booking.count({ where: { date: instant } }),
          db.slotBlock.count({ where: { date: instant } }),
        ]);
        expect(bookings + blocks).toBe(1);
      }
    });
  });

  describe("bloquear dia inteiro", () => {
    it("bloqueia os livres numa transação e mantém as reservas existentes", async () => {
      await clientBooks(clienteA, FRIDAY_0900);
      await manual("11:30");
      await asAdmin(() => blockSlot({ date: FRIDAY, time: "10:30", reason: "Antigo" }));

      expect(await asAdmin(() => blockDay({ date: FRIDAY, reason: "Feriado" }))).toEqual({
        success: true,
        message: "8 horários bloqueados, 2 reservas mantidas (cancele à parte se precisar).",
      });

      const bookings = await db.booking.findMany({ orderBy: { date: "asc" } });
      expect(bookings.map((booking) => [booking.date, booking.source])).toEqual([
        [FRIDAY_0900, "CLIENT"],
        [FRIDAY_1130, "MANUAL"],
      ]);
      const blocks = await db.slotBlock.findMany({ orderBy: { date: "asc" } });
      expect(blocks).toHaveLength(9);
      expect(blocks.find((block) => block.date.getTime() === FRIDAY_1030.getTime())?.reason).toBe("Antigo");
      expect(blocks.filter((block) => block.reason === "Feriado")).toHaveLength(8);
      // Sábado não foi tocado.
      expect(await db.slotBlock.count({ where: { date: { gte: sp("2030-01-05T00:00:00") } } })).toBe(0);
      expect(await clientBooks(clienteB, sp("2030-01-04T19:30:00"))).toMatchObject({ code: "SLOT_UNAVAILABLE" });
    });

    it("desbloquear dia remove os bloqueios só daquele dia", async () => {
      await asAdmin(() => blockDay({ date: FRIDAY }));
      await asAdmin(() => blockSlot({ date: "2030-01-05", time: "09:00" }));

      expect(await asAdmin(() => unblockDay({ date: FRIDAY }))).toEqual({
        success: true,
        message: "11 horários desbloqueados.",
      });
      expect(await db.slotBlock.findMany({ select: { date: true } })).toEqual([{ date: sp("2030-01-05T09:00:00") }]);
    });

    it("conta comum não consegue bloquear dia", async () => {
      expect(await as(clienteA, () => blockDay({ date: FRIDAY }))).toEqual(failed("UNAUTHORIZED"));
      expect(await db.slotBlock.count()).toBe(0);
    });
  });

  describe("reserva manual", () => {
    it("grava MANUAL sem userId, com nome e telefone; o horário fica ocupado para o cliente", async () => {
      expect(await manual("09:00")).toEqual({ success: true, message: "Reservado para João Manual: Sex 4 às 09:00." });

      const booking = await db.booking.findFirstOrThrow({ where: { date: FRIDAY_0900 } });
      expect(booking).toMatchObject({
        barbershopId: barbershop.id,
        serviceId: service.id,
        userId: null,
        customerName: "João Manual",
        customerPhone: "11912345678",
        source: "MANUAL",
      });
      expect(await statusOf("09:00")).toBe("TAKEN");
      expect(await clientBooks(clienteA, FRIDAY_0900)).toMatchObject({ success: false, code: "SLOT_TAKEN" });
    });

    it("recusa horário reservado, bloqueado ou fora da semana aberta", async () => {
      await clientBooks(clienteA, FRIDAY_0900);
      await asAdmin(() => blockSlot({ date: FRIDAY, time: "10:30" }));

      expect(await manual("09:00")).toEqual(failed("SLOT_TAKEN"));
      expect(await manual("10:30")).toEqual(failed("SLOT_BLOCKED"));
      expect(await manual("09:00", { date: "2030-01-11" })).toEqual(failed("OUTSIDE_SCHEDULE"));
      expect(await db.booking.count({ where: { source: "MANUAL" } })).toBe(0);
    });
  });

  describe("cancelamento pelo admin", () => {
    it("grava BookingCancellation com byAdmin = true e o source original; a métrica conta", async () => {
      await manual("09:00");
      const booking = await db.booking.findFirstOrThrow({ where: { date: FRIDAY_0900 } });

      expect(await asAdmin(() => adminCancelBooking(booking.id))).toMatchObject({ success: true });

      expect(await db.booking.count()).toBe(0);
      expect(await db.bookingCancellation.findMany()).toMatchObject([
        { bookingId: booking.id, date: FRIDAY_0900, byAdmin: true, source: "MANUAL" },
      ]);
      const metrics = await getBookingMetrics(sp("2029-12-31T00:00:00"), sp("2030-01-06T23:59:59"));
      expect(metrics).toMatchObject({ confirmadas: 0, canceladas: 1 });
      // O horário voltou a ficar livre.
      expect(await clientBooks(clienteA, FRIDAY_0900)).toEqual({ success: true });
    });

    it("byAdmin = true também na reserva do próprio admin", async () => {
      await as(admin, () => saveBooking({ barbershopId: barbershop.id, serviceId: service.id, date: FRIDAY_0900.toISOString() }), true);
      const booking = await db.booking.findFirstOrThrow();

      await asAdmin(() => adminCancelBooking(booking.id));

      expect(await db.bookingCancellation.findFirstOrThrow()).toMatchObject({ byAdmin: true, source: "CLIENT" });
    });
  });

  it("conta comum é recusada em todas as actions do painel, sem mudar o banco", async () => {
    await clientBooks(clienteB, FRIDAY_0900);
    await asAdmin(() => blockSlot({ date: FRIDAY, time: "10:30" }));
    const booking = await db.booking.findFirstOrThrow();

    const results = [
      await as(clienteA, () => blockSlot({ date: FRIDAY, time: "11:30" })),
      await as(clienteA, () => unblockSlot({ date: FRIDAY, time: "10:30" })),
      await as(clienteA, () => blockDay({ date: FRIDAY })),
      await as(clienteA, () => unblockDay({ date: FRIDAY })),
      await as(clienteA, () =>
        createManualBooking({ date: FRIDAY, time: "12:30", serviceId: service.id, customerName: "X", customerPhone: "11912345678" }),
      ),
      await as(clienteA, () => adminCancelBooking(booking.id)),
    ];

    expect(results).toEqual(Array(6).fill(failed("UNAUTHORIZED")));
    expect(await db.booking.count()).toBe(1);
    expect(await db.slotBlock.count()).toBe(1);
    expect(await db.bookingCancellation.count()).toBe(0);
  });
});
