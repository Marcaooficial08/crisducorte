import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
  createCancellation: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));
vi.mock("@/app/_lib/prisma", () => ({
  db: {
    booking: { findUnique: mocks.findUnique, delete: mocks.delete },
    bookingCancellation: { create: mocks.createCancellation },
    $transaction: mocks.transaction,
  },
}));

import { cancelBooking } from "./cancel-booking";
import { resetRateLimit } from "@/app/_lib/rate-limit";

const sessionOf = (id: string, isAdmin = false) => ({
  user: { id, name: "Teste", email: `${id}@example.com`, isAdmin },
  expires: "2999-01-01T00:00:00.000Z",
});

const slotDate = new Date("2026-10-16T12:00:00.000Z");

describe("cancelBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    mocks.findUnique.mockResolvedValue({ id: "booking-1", userId: "cliente-a", date: slotDate, source: "CLIENT" });
    mocks.delete.mockResolvedValue({});
    mocks.createCancellation.mockResolvedValue({});
    mocks.transaction.mockResolvedValue([]);
  });

  it("recusa sem sessão", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(cancelBooking("booking-1")).rejects.toThrow("Não autenticado.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("cancela a própria reserva e registra o cancelamento na mesma transação", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-a"));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "booking-1" } });
    expect(mocks.createCancellation).toHaveBeenCalledWith({
      data: { bookingId: "booking-1", date: slotDate, byAdmin: false, source: "CLIENT" },
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("recusa cancelar a reserva de outro cliente", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("cliente-b"));

    await expect(cancelBooking("booking-1")).rejects.toThrow("Sem permissão para cancelar esta reserva.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("admin cancela a reserva de qualquer cliente (byAdmin)", async () => {
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.delete).toHaveBeenCalled();
    expect(mocks.createCancellation).toHaveBeenCalledWith({ data: expect.objectContaining({ byAdmin: true }) });
  });

  it("admin cancelando a própria reserva não conta como byAdmin", async () => {
    mocks.findUnique.mockResolvedValue({ id: "booking-1", userId: "admin", date: slotDate, source: "CLIENT" });
    mocks.getServerSession.mockResolvedValue(sessionOf("admin", true));

    await expect(cancelBooking("booking-1")).resolves.toEqual({ success: true });
    expect(mocks.createCancellation).toHaveBeenCalledWith({ data: expect.objectContaining({ byAdmin: false }) });
  });
});
