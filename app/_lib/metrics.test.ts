import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/app/_lib/prisma", () => ({
  db: { booking: { findMany: (...args: unknown[]) => findMany(...args) } },
}));

import { getBookingMetrics } from "./metrics";

describe("getBookingMetrics", () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it("filtra pelo período informado", async () => {
    findMany.mockResolvedValue([]);
    const desde = new Date("2026-10-01T00:00:00Z");
    const ate = new Date("2026-10-31T23:59:59Z");

    await getBookingMetrics(desde, ate);

    expect(findMany).toHaveBeenCalledWith({
      where: { date: { gte: desde, lte: ate } },
      select: { date: true },
    });
  });

  it("conta confirmadas e agrupa por semana (segunda-feira)", async () => {
    findMany.mockResolvedValue([
      { date: new Date("2026-10-16T09:00:00Z") }, // sexta
      { date: new Date("2026-10-17T10:30:00Z") }, // sábado, mesma semana
      { date: new Date("2026-10-18T12:00:00Z") }, // domingo, ainda a mesma semana
      { date: new Date("2026-10-23T19:30:00Z") }, // sexta seguinte
    ]);

    const result = await getBookingMetrics(new Date("2026-10-01"), new Date("2026-10-31"));

    expect(result).toEqual({
      confirmadas: 4,
      porSemana: [
        { semana: "2026-10-12", total: 3 },
        { semana: "2026-10-19", total: 1 },
      ],
    });
  });

  it("retorna zero sem reservas", async () => {
    findMany.mockResolvedValue([]);

    const result = await getBookingMetrics(new Date("2026-10-01"), new Date("2026-10-31"));

    expect(result).toEqual({ confirmadas: 0, porSemana: [] });
  });
});
