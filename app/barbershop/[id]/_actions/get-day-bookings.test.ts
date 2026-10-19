import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findBookings: vi.fn(), findBlocks: vi.fn() }));

vi.mock("@/app/_lib/prisma", () => ({
  db: { booking: { findMany: mocks.findBookings }, slotBlock: { findMany: mocks.findBlocks } },
}));

import { getDayBookings } from "./get-day-bookings";

describe("getDayBookings (/barbershop/[id], pública)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devolve reservas e bloqueios do dia, só com a data (sem dado pessoal)", async () => {
    const booked = new Date("2026-10-16T12:00:00.000Z");
    const blocked = new Date("2026-10-16T13:30:00.000Z");
    mocks.findBookings.mockResolvedValue([{ date: booked }]);
    mocks.findBlocks.mockResolvedValue([{ date: blocked }]);

    const result = await getDayBookings("shop-1", new Date("2026-10-16T15:00:00.000Z"));

    expect(result).toEqual([{ date: booked }, { date: blocked }]);
    // Só a coluna date é lida: nome, telefone e userId nem saem do banco.
    expect(mocks.findBookings).toHaveBeenCalledWith(expect.objectContaining({ select: { date: true } }));
    expect(mocks.findBlocks).toHaveBeenCalledWith(expect.objectContaining({ select: { date: true } }));
  });

  it("consulta o dia inteiro em São Paulo, só da barbearia pedida", async () => {
    mocks.findBookings.mockResolvedValue([]);
    mocks.findBlocks.mockResolvedValue([]);

    await getDayBookings("shop-1", new Date("2026-10-16T15:00:00.000Z"));

    expect(mocks.findBookings).toHaveBeenCalledWith({
      where: {
        barbershopId: "shop-1",
        date: { gte: new Date("2026-10-16T03:00:00.000Z"), lte: new Date("2026-10-17T02:59:59.999Z") },
      },
      select: { date: true },
    });
  });
});
