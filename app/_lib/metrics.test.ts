import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const findCancellations = vi.fn();

vi.mock("@/app/_lib/prisma", () => ({
  db: {
    booking: { findMany: (...args: unknown[]) => findMany(...args) },
    bookingCancellation: { findMany: (...args: unknown[]) => findCancellations(...args) },
  },
}));

import { getBookingMetrics, recentWeeksWindow } from "./metrics";

describe("getBookingMetrics", () => {
  beforeEach(() => {
    findMany.mockReset();
    findCancellations.mockReset();
    findCancellations.mockResolvedValue([]);
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
    expect(findCancellations).toHaveBeenCalledWith({
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
      canceladas: 0,
      porSemana: [
        { semana: "2026-10-12", total: 3, canceladas: 0 },
        { semana: "2026-10-19", total: 1, canceladas: 0 },
      ],
    });
  });

  it("conta canceladas pela data do horário, inclusive em semana sem confirmadas", async () => {
    findMany.mockResolvedValue([{ date: new Date("2026-10-16T09:00:00Z") }]);
    findCancellations.mockResolvedValue([
      { date: new Date("2026-10-17T10:30:00Z") }, // mesma semana
      { date: new Date("2026-10-30T12:00:00Z") }, // semana só com cancelada
    ]);

    const result = await getBookingMetrics(new Date("2026-10-01"), new Date("2026-10-31"));

    expect(result).toEqual({
      confirmadas: 1,
      canceladas: 2,
      porSemana: [
        { semana: "2026-10-12", total: 1, canceladas: 1 },
        { semana: "2026-10-26", total: 0, canceladas: 1 },
      ],
    });
  });

  it("retorna zero sem reservas", async () => {
    findMany.mockResolvedValue([]);

    const result = await getBookingMetrics(new Date("2026-10-01"), new Date("2026-10-31"));

    expect(result).toEqual({ confirmadas: 0, canceladas: 0, porSemana: [] });
  });
});

describe("recentWeeksWindow", () => {
  it("semana atual + 4 anteriores, de segunda 00:00 a domingo 23:59:59.999 (UTC)", () => {
    const window = recentWeeksWindow(new Date("2026-10-21T15:00:00.000Z")); // quarta

    expect(window.desde).toEqual(new Date("2026-09-21T00:00:00.000Z"));
    expect(window.ate).toEqual(new Date("2026-10-25T23:59:59.999Z"));
    expect(window.semanas).toEqual(["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]);
  });

  it("domingo ainda é da semana que começou na segunda", () => {
    const window = recentWeeksWindow(new Date("2026-10-25T20:00:00.000Z"), 0);

    expect(window.semanas).toEqual(["2026-10-19"]);
  });
});
