import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  lock: vi.fn(),
  findBarbershop: vi.fn(),
  findService: vi.fn(),
  findBooking: vi.fn(),
  findBookings: vi.fn(),
  findUniqueBooking: vi.fn(),
  createBooking: vi.fn(),
  deleteBooking: vi.fn(),
  findBlock: vi.fn(),
  findBlocks: vi.fn(),
  createBlock: vi.fn(),
  createBlocks: vi.fn(),
  deleteBlocks: vi.fn(),
  createCancellation: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => {
  const client = {
    $executeRaw: mocks.lock,
    barbershop: { findFirst: mocks.findBarbershop },
    service: { findFirst: mocks.findService },
    booking: {
      findFirst: mocks.findBooking,
      findMany: mocks.findBookings,
      findUnique: mocks.findUniqueBooking,
      create: mocks.createBooking,
      delete: mocks.deleteBooking,
    },
    slotBlock: {
      findUnique: mocks.findBlock,
      findMany: mocks.findBlocks,
      create: mocks.createBlock,
      createMany: mocks.createBlocks,
      deleteMany: mocks.deleteBlocks,
    },
    bookingCancellation: { create: mocks.createCancellation },
  };
  return {
    db: {
      ...client,
      // Forma interativa (fn) ou lista de operações, como o Prisma.
      $transaction: async (arg: unknown) =>
        typeof arg === "function" ? (arg as (tx: unknown) => Promise<unknown>)(client) : Promise.all(arg as unknown[]),
    },
  };
});

import { blockSlot } from "./block-slot";
import { unblockSlot } from "./unblock-slot";
import { blockDay } from "./block-day";
import { unblockDay } from "./unblock-day";
import { createManualBooking } from "./create-manual-booking";
import { adminCancelBooking } from "./admin-cancel-booking";
import { ADMIN_ERROR_MESSAGES, AdminErrorCode } from "@/app/_lib/admin-actions";

// Relógio fixo (getNow = new Date()): quarta 14/10/2026 12:00 em São Paulo; liberados sexta 16 e sábado 17.
const WEDNESDAY_NOON = new Date("2026-10-14T15:00:00.000Z");
const FRIDAY_0900 = new Date("2026-10-16T12:00:00.000Z");
const FRIDAY_1030 = new Date("2026-10-16T13:30:00.000Z");

const sessionOf = (isAdmin: boolean) => ({
  user: { id: isAdmin ? "admin-1" : "user-1", name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const failed = (code: AdminErrorCode) => ({ success: false, code, error: ADMIN_ERROR_MESSAGES[code] });

const manualInput = {
  date: "2026-10-16",
  time: "09:00",
  serviceId: "service-1",
  customerName: "  João da Silva ",
  customerPhone: "(11) 91234-5678",
};

const writeMocks = () => [
  mocks.lock,
  mocks.createBooking,
  mocks.deleteBooking,
  mocks.createBlock,
  mocks.createBlocks,
  mocks.deleteBlocks,
  mocks.createCancellation,
];

describe("Server Actions do painel do admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(WEDNESDAY_NOON);
    mocks.getServerSession.mockResolvedValue(sessionOf(true));
    mocks.lock.mockResolvedValue(1);
    mocks.findBarbershop.mockResolvedValue({ id: "shop-1" });
    mocks.findService.mockResolvedValue({ id: "service-1" });
    mocks.findBooking.mockResolvedValue(null);
    mocks.findBookings.mockResolvedValue([]);
    mocks.findBlock.mockResolvedValue(null);
    mocks.findBlocks.mockResolvedValue([]);
    mocks.createBooking.mockResolvedValue({});
    mocks.createBlock.mockResolvedValue({});
    mocks.createBlocks.mockResolvedValue({ count: 0 });
    mocks.deleteBlocks.mockResolvedValue({ count: 0 });
    mocks.createCancellation.mockResolvedValue({});
    mocks.deleteBooking.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isAdmin conferido no servidor", () => {
    const calls = {
      blockSlot: () => blockSlot({ date: "2026-10-16", time: "09:00" }),
      unblockSlot: () => unblockSlot({ date: "2026-10-16", time: "09:00" }),
      blockDay: () => blockDay({ date: "2026-10-16" }),
      unblockDay: () => unblockDay({ date: "2026-10-16" }),
      createManualBooking: () => createManualBooking(manualInput),
      adminCancelBooking: () => adminCancelBooking("booking-1"),
    };

    for (const [name, call] of Object.entries(calls)) {
      it(`${name}: sem sessão e conta comum são recusadas sem tocar no banco`, async () => {
        mocks.getServerSession.mockResolvedValueOnce(null);
        expect(await call()).toEqual(failed("UNAUTHORIZED"));
        mocks.getServerSession.mockResolvedValueOnce(sessionOf(false));
        expect(await call()).toEqual(failed("UNAUTHORIZED"));

        for (const mock of [...writeMocks(), mocks.findBarbershop, mocks.findUniqueBooking]) {
          expect(mock).not.toHaveBeenCalled();
        }
      });
    }
  });

  describe("blockSlot", () => {
    it("bloqueia horário livre, com trava e motivo", async () => {
      const result = await blockSlot({ date: "2026-10-16", time: "09:00", reason: "  Médico " });

      expect(result).toEqual({ success: true, message: "Horário 09:00 bloqueado." });
      expect(mocks.lock.mock.calls[0][1]).toBe("slot:shop-1:2026-10-16T12:00:00.000Z");
      expect(mocks.createBlock).toHaveBeenCalledWith({ data: { date: FRIDAY_0900, reason: "Médico" } });
    });

    it("motivo vazio vira null", async () => {
      await blockSlot({ date: "2026-10-16", time: "09:00", reason: "   " });

      expect(mocks.createBlock).toHaveBeenCalledWith({ data: { date: FRIDAY_0900, reason: null } });
    });

    it("recusa horário com reserva", async () => {
      mocks.findBooking.mockResolvedValue({ id: "booking-1" });

      expect(await blockSlot({ date: "2026-10-16", time: "09:00" })).toEqual(failed("HAS_BOOKING"));
      expect(mocks.createBlock).not.toHaveBeenCalled();
    });

    it("recusa fora da semana aberta e horário fora da grade", async () => {
      expect(await blockSlot({ date: "2026-10-23", time: "09:00" })).toEqual(failed("OUTSIDE_SCHEDULE"));
      expect(await blockSlot({ date: "2026-10-16", time: "09:30" })).toEqual(failed("INVALID"));
      expect(await blockSlot({ date: "16/10/2026", time: "09:00" })).toEqual(failed("INVALID"));
      expect(mocks.createBlock).not.toHaveBeenCalled();
    });

    it("recusa motivo com mais de 80 caracteres", async () => {
      expect(await blockSlot({ date: "2026-10-16", time: "09:00", reason: "x".repeat(81) })).toEqual(failed("INVALID"));
    });

    it("já bloqueado (ou bloqueado ao mesmo tempo, P2002) não dá erro", async () => {
      mocks.findBlock.mockResolvedValueOnce({ id: "block-1" });
      expect((await blockSlot({ date: "2026-10-16", time: "09:00" })).success).toBe(true);
      expect(mocks.createBlock).not.toHaveBeenCalled();

      mocks.createBlock.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
      );
      expect((await blockSlot({ date: "2026-10-16", time: "09:00" })).success).toBe(true);
    });
  });

  describe("unblockSlot / unblockDay", () => {
    it("remove o bloqueio do horário", async () => {
      expect(await unblockSlot({ date: "2026-10-16", time: "10:30" })).toEqual({
        success: true,
        message: "Horário 10:30 desbloqueado.",
      });
      expect(mocks.deleteBlocks).toHaveBeenCalledWith({ where: { date: FRIDAY_1030 } });
    });

    it("remove todos os bloqueios do dia (São Paulo)", async () => {
      mocks.deleteBlocks.mockResolvedValue({ count: 3 });

      expect(await unblockDay({ date: "2026-10-16" })).toEqual({ success: true, message: "3 horários desbloqueados." });
      expect(mocks.deleteBlocks).toHaveBeenCalledWith({
        where: { date: { gte: new Date("2026-10-16T03:00:00.000Z"), lt: new Date("2026-10-17T03:00:00.000Z") } },
      });
    });
  });

  describe("blockDay", () => {
    it("bloqueia só os livres, mantém as reservas e trava cada horário em ordem", async () => {
      mocks.findBookings.mockResolvedValue([{ date: FRIDAY_0900 }]);
      mocks.findBlocks.mockResolvedValue([{ date: FRIDAY_1030 }]);

      const result = await blockDay({ date: "2026-10-16", reason: "Feriado" });

      expect(result).toEqual({
        success: true,
        message: "9 horários bloqueados, 1 reserva mantida (cancele à parte se precisar).",
      });
      expect(mocks.lock).toHaveBeenCalledTimes(11);
      const keys = mocks.lock.mock.calls.map((call) => call[1] as string);
      expect(keys).toEqual([...keys].sort());
      const data = mocks.createBlocks.mock.calls[0][0].data as { date: Date; reason: string }[];
      expect(data).toHaveLength(9);
      expect(data.every((block) => block.reason === "Feriado")).toBe(true);
      expect(data.map((block) => block.date.getTime())).not.toContain(FRIDAY_0900.getTime());
      expect(data.map((block) => block.date.getTime())).not.toContain(FRIDAY_1030.getTime());
    });

    it("dia de hoje: só os horários que ainda vão acontecer", async () => {
      vi.setSystemTime(new Date("2026-10-16T17:00:00.000Z")); // sexta 14:00 em São Paulo

      expect(await blockDay({ date: "2026-10-16" })).toEqual({
        success: true,
        message: "6 horários bloqueados, 0 reservas mantidas.",
      });
      expect(mocks.lock).toHaveBeenCalledTimes(6);
    });

    it("recusa dia fora da semana aberta (domingo não tem dia nenhum)", async () => {
      expect(await blockDay({ date: "2026-10-23" })).toEqual(failed("OUTSIDE_SCHEDULE"));
      vi.setSystemTime(new Date("2026-10-18T15:00:00.000Z"));
      expect(await blockDay({ date: "2026-10-17" })).toEqual(failed("OUTSIDE_SCHEDULE"));
      expect(mocks.createBlocks).not.toHaveBeenCalled();
    });
  });

  describe("createManualBooking", () => {
    it("grava MANUAL, sem userId, com nome e telefone só com dígitos", async () => {
      const result = await createManualBooking(manualInput);

      expect(result).toEqual({ success: true, message: "Reservado para João da Silva: Sex 16 às 09:00." });
      expect(mocks.lock.mock.calls[0][1]).toBe("slot:shop-1:2026-10-16T12:00:00.000Z");
      expect(mocks.createBooking).toHaveBeenCalledWith({
        data: {
          barbershopId: "shop-1",
          serviceId: "service-1",
          date: FRIDAY_0900,
          userId: null,
          customerName: "João da Silva",
          customerPhone: "11912345678",
          source: "MANUAL",
        },
      });
    });

    it("recusa nome vazio e telefone inválido", async () => {
      expect(await createManualBooking({ ...manualInput, customerName: "   " })).toEqual(failed("INVALID_NAME"));
      expect(await createManualBooking({ ...manualInput, customerPhone: "1234" })).toEqual(failed("INVALID_PHONE"));
      expect(mocks.createBooking).not.toHaveBeenCalled();
    });

    it("recusa serviço de outra barbearia", async () => {
      mocks.findService.mockResolvedValue(null);

      expect(await createManualBooking(manualInput)).toEqual(failed("INVALID"));
      expect(mocks.findService).toHaveBeenCalledWith({ where: { id: "service-1", barbershopId: "shop-1" }, select: { id: true } });
      expect(mocks.createBooking).not.toHaveBeenCalled();
    });

    it("recusa horário reservado, bloqueado ou fora da semana aberta", async () => {
      mocks.findBooking.mockResolvedValueOnce({ id: "booking-1" });
      expect(await createManualBooking(manualInput)).toEqual(failed("SLOT_TAKEN"));

      mocks.findBlock.mockResolvedValueOnce({ id: "block-1" });
      expect(await createManualBooking(manualInput)).toEqual(failed("SLOT_BLOCKED"));

      expect(await createManualBooking({ ...manualInput, date: "2026-10-23" })).toEqual(failed("OUTSIDE_SCHEDULE"));
      expect(mocks.createBooking).not.toHaveBeenCalled();
    });

    it("P2002 (cliente reservou junto) vira horário com reserva", async () => {
      mocks.createBooking.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
      );

      expect(await createManualBooking(manualInput)).toEqual(failed("SLOT_TAKEN"));
    });
  });

  describe("adminCancelBooking", () => {
    it("grava byAdmin = true e o source original, e apaga a reserva", async () => {
      mocks.findUniqueBooking.mockResolvedValue({ id: "booking-1", date: FRIDAY_0900, source: "MANUAL", userId: null });

      expect(await adminCancelBooking("booking-1")).toEqual({
        success: true,
        message: "Reserva cancelada. O horário voltou a ficar livre.",
      });
      expect(mocks.createCancellation).toHaveBeenCalledWith({
        data: { bookingId: "booking-1", date: FRIDAY_0900, byAdmin: true, source: "MANUAL" },
      });
      expect(mocks.deleteBooking).toHaveBeenCalledWith({ where: { id: "booking-1" } });
    });

    it("byAdmin = true mesmo na reserva do próprio admin", async () => {
      mocks.findUniqueBooking.mockResolvedValue({ id: "booking-1", date: FRIDAY_0900, source: "CLIENT", userId: "admin-1" });

      await adminCancelBooking("booking-1");

      expect(mocks.createCancellation).toHaveBeenCalledWith({ data: expect.objectContaining({ byAdmin: true, source: "CLIENT" }) });
    });

    it("reserva que não existe (ou cancelada junto, P2025)", async () => {
      mocks.findUniqueBooking.mockResolvedValueOnce(null);
      expect(await adminCancelBooking("booking-1")).toEqual(failed("NOT_FOUND"));

      mocks.findUniqueBooking.mockResolvedValueOnce({ id: "booking-1", date: FRIDAY_0900, source: "CLIENT", userId: "u" });
      mocks.deleteBooking.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Record not found", { code: "P2025", clientVersion: "test" }),
      );
      expect(await adminCancelBooking("booking-1")).toEqual(failed("NOT_FOUND"));
    });
  });
});
