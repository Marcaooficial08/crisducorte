import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({
  db: {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ booking: { findFirst: mocks.findFirst, create: mocks.create } }),
  },
}));

import { saveBooking } from "./save-booking";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { BOOKING_ERROR_MESSAGES } from "@/app/_lib/booking-errors";

const params = {
  barbershopId: "shop-1",
  serviceId: "service-1",
  date: "2026-10-16T12:00:00.000Z",
};

const sessionOf = (id: string, isAdmin = false) => ({
  user: { id, name: "Teste", email: "teste@example.com", isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

describe("saveBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({});
  });

  it("recusa sem sessão e não grava nada", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    const result = await saveBooking(params);

    expect(result).toEqual({ success: false, code: "UNAUTHENTICATED", error: "Faça login para agendar." });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("grava com o userId da sessão, ignorando userId enviado pelo navegador", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("user-sessao"));

    const result = await saveBooking({ ...params, userId: "user-forjado" } as typeof params);

    expect(result).toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-sessao" }),
    });
  });

  it("recusa horário já reservado", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("user-1"));
    mocks.findFirst.mockResolvedValue({ id: "booking-1" });

    const result = await saveBooking(params);

    expect(result).toEqual({ success: false, code: "SLOT_TAKEN", error: BOOKING_ERROR_MESSAGES.SLOT_TAKEN });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("P2002 (dois gravando juntos) vira horário tomado", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("user-1"));
    mocks.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
    );

    const result = await saveBooking(params);

    expect(result).toEqual({ success: false, code: "SLOT_TAKEN", error: BOOKING_ERROR_MESSAGES.SLOT_TAKEN });
  });

  it("erro inesperado vira a mensagem genérica", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("user-1"));
    mocks.create.mockRejectedValue(new Error("conexão caiu"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await saveBooking(params);

    expect(result).toEqual({ success: false, code: "GENERIC", error: BOOKING_ERROR_MESSAGES.GENERIC });
  });

  it("bloqueia a 11ª tentativa no mesmo minuto", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("user-1"));

    for (let i = 0; i < 10; i++) {
      await saveBooking(params);
    }
    const result = await saveBooking(params);

    expect(result).toEqual({ success: false, code: "RATE_LIMIT", error: "Muitas tentativas seguidas. Aguarde 1 minuto." });
    expect(mocks.create).toHaveBeenCalledTimes(10);
  });

  describe("flag AGENDA_V2", () => {
    // Quarta 14/10/2026 12:00 em São Paulo: liberados sexta 16 e sábado 17.
    const outOfRule = { ...params, date: "2026-10-24T12:00:00.000Z" }; // sábado seguinte, 09:00 SP
    const valid = { ...params, date: "2026-10-16T12:00:00.000Z" }; // sexta 16, 09:00 SP

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-14T15:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    });

    it("off: aceita como hoje, mesmo fora da regra nova", async () => {
      vi.stubEnv("AGENDA_V2", "off");
      mocks.getServerSession.mockResolvedValue(sessionOf("user-1"));

      expect(await saveBooking(outOfRule)).toEqual({ success: true });
    });

    it("admin: valida para o admin e não para o cliente comum", async () => {
      vi.stubEnv("AGENDA_V2", "admin");

      mocks.getServerSession.mockResolvedValueOnce(sessionOf("admin-1", true));
      expect(await saveBooking(outOfRule)).toEqual({ success: false, code: "SLOT_UNAVAILABLE", error: BOOKING_ERROR_MESSAGES.SLOT_UNAVAILABLE });

      mocks.getServerSession.mockResolvedValueOnce(sessionOf("user-1"));
      expect(await saveBooking(outOfRule)).toEqual({ success: true });
      expect(mocks.create).toHaveBeenCalledTimes(1);
    });

    it("all: recusa fora da regra e aceita horário liberado", async () => {
      vi.stubEnv("AGENDA_V2", "all");
      mocks.getServerSession.mockResolvedValue(sessionOf("user-1"));

      expect(await saveBooking(outOfRule)).toEqual({ success: false, code: "SLOT_UNAVAILABLE", error: BOOKING_ERROR_MESSAGES.SLOT_UNAVAILABLE });
      expect(mocks.create).not.toHaveBeenCalled();
      expect(await saveBooking(valid)).toEqual({ success: true });
    });
  });

  describe("flag NEW_HOME", () => {
    const outOfRule = { ...params, date: "2026-10-24T12:00:00.000Z" }; // sábado seguinte, 09:00 SP
    const valid = { ...params, date: "2026-10-16T12:00:00.000Z" }; // sexta 16, 09:00 SP

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-14T15:00:00.000Z"));
      vi.stubEnv("AGENDA_V2", "off");
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    });

    it("home nova ligada valida a regra mesmo com AGENDA_V2 off", async () => {
      vi.stubEnv("NEW_HOME", "admin");

      mocks.getServerSession.mockResolvedValueOnce(sessionOf("admin-1", true));
      expect(await saveBooking(outOfRule)).toEqual({ success: false, code: "SLOT_UNAVAILABLE", error: BOOKING_ERROR_MESSAGES.SLOT_UNAVAILABLE });

      mocks.getServerSession.mockResolvedValueOnce(sessionOf("admin-1", true));
      expect(await saveBooking(valid)).toEqual({ success: true });

      // Cliente sem a home nova: como antes.
      mocks.getServerSession.mockResolvedValueOnce(sessionOf("user-1"));
      expect(await saveBooking(outOfRule)).toEqual({ success: true });
    });
  });
});
