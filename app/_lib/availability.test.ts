import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findBlock: vi.fn(),
  findBlocks: vi.fn(),
}));

vi.mock("@/app/_lib/prisma", () => ({
  db: {
    booking: { findFirst: mocks.findFirst, findMany: mocks.findMany },
    slotBlock: { findUnique: mocks.findBlock, findMany: mocks.findBlocks },
  },
}));

import {
  dayRange,
  getDaySlots,
  getInstantStatus,
  getSlotStatus,
  getTakenInstants,
  isSlotAvailable,
  slotFromInstant,
  slotInstant,
} from "./availability";
import { TIME_GRID } from "./schedule";

// Quarta 14/10/2026 12:00 em São Paulo: liberados sexta 16 e sábado 17.
const wednesday = new Date("2026-10-14T15:00:00.000Z");
const options = { barbershopId: "shop-1", now: wednesday };

describe("slotInstant / slotFromInstant", () => {
  it("converte data e hora de São Paulo para o instante e de volta", () => {
    expect(slotInstant("2026-10-16", "09:00")).toEqual(new Date("2026-10-16T12:00:00.000Z"));
    expect(slotFromInstant(new Date("2026-10-16T12:00:00.000Z"))).toEqual({ date: "2026-10-16", time: "09:00" });
  });

  it("recusa instante inválido ou com segundos", () => {
    expect(slotFromInstant(new Date("lixo"))).toBeNull();
    expect(slotFromInstant(new Date("2026-10-16T12:00:30.000Z"))).toBeNull();
  });
});

describe("isSlotAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(null);
    mocks.findBlock.mockResolvedValue(null);
  });

  it("horário livre num dia liberado", async () => {
    expect(await isSlotAvailable("2026-10-16", "09:00", options)).toBe(true);
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { barbershopId: "shop-1", date: new Date("2026-10-16T12:00:00.000Z") },
      select: { id: true },
    });
  });

  it("fora da grade não consulta o banco", async () => {
    expect(await getSlotStatus("2026-10-16", "10:00", options)).toBe("OUTSIDE_SCHEDULE");
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("dia fora da regra (sábado da semana seguinte, quinta) é indisponível", async () => {
    expect(await getSlotStatus("2026-10-24", "09:00", options)).toBe("OUTSIDE_SCHEDULE");
    expect(await getSlotStatus("2026-10-15", "09:00", options)).toBe("OUTSIDE_SCHEDULE");
  });

  it("domingo não libera dia nenhum", async () => {
    const sunday = new Date("2026-10-18T15:00:00.000Z");
    expect(await isSlotAvailable("2026-10-23", "09:00", { ...options, now: sunday })).toBe(false);
  });

  it("horário que já passou na sexta é indisponível; o seguinte não", async () => {
    const fridayAfternoon = new Date("2026-10-16T17:00:00.000Z"); // 14:00 SP
    expect(await getSlotStatus("2026-10-16", "13:30", { ...options, now: fridayAfternoon })).toBe("OUTSIDE_SCHEDULE");
    expect(await getSlotStatus("2026-10-16", "14:30", { ...options, now: fridayAfternoon })).toBe("AVAILABLE");
  });

  it("horário reservado", async () => {
    mocks.findFirst.mockResolvedValue({ id: "booking-1" });
    expect(await getSlotStatus("2026-10-16", "09:00", options)).toBe("TAKEN");
    expect(await isSlotAvailable("2026-10-16", "09:00", options)).toBe(false);
  });

  it("horário bloqueado", async () => {
    mocks.findBlock.mockResolvedValue({ id: "block-1" });
    expect(await getSlotStatus("2026-10-17", "19:30", options)).toBe("BLOCKED");
    expect(mocks.findBlock).toHaveBeenCalledWith({
      where: { date: new Date("2026-10-17T22:30:00.000Z") },
      select: { id: true },
    });
  });

  it("usa o client da transação quando informado", async () => {
    const tx = {
      booking: { findFirst: vi.fn().mockResolvedValue(null) },
      slotBlock: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    expect(await getInstantStatus("shop-1", new Date("2026-10-16T12:00:00.000Z"), tx as never)).toBe("AVAILABLE");
    expect(tx.booking.findFirst).toHaveBeenCalled();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});

describe("getDaySlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
    mocks.findBlocks.mockResolvedValue([]);
  });

  it("dia fora da regra devolve null", async () => {
    expect(await getDaySlots("2026-10-24", options)).toBeNull();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("marca reservados e bloqueados como ocupados", async () => {
    mocks.findMany.mockResolvedValue([{ date: new Date("2026-10-16T12:00:00.000Z") }]); // 09:00
    mocks.findBlocks.mockResolvedValue([{ date: new Date("2026-10-16T13:30:00.000Z") }]); // 10:30

    const day = await getDaySlots("2026-10-16", options);

    expect(day).toMatchObject({ date: "2026-10-16", label: "Sex 16", freeCount: 9 });
    expect(day?.slots).toHaveLength(TIME_GRID.length);
    expect(day?.slots.filter((slot) => slot.booked).map((slot) => slot.time)).toEqual(["09:00", "10:30"]);
  });

  it("consulta o dia inteiro no fuso de São Paulo, só da barbearia pedida", async () => {
    await getDaySlots("2026-10-16", options);

    const range = { gte: new Date("2026-10-16T03:00:00.000Z"), lt: new Date("2026-10-17T03:00:00.000Z") };
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { barbershopId: "shop-1", date: range }, select: { date: true } });
    expect(mocks.findBlocks).toHaveBeenCalledWith({ where: { date: range }, select: { date: true } });
  });

  it("sexta à tarde só traz os horários futuros", async () => {
    const fridayAfternoon = new Date("2026-10-16T17:00:00.000Z"); // 14:00 SP
    const day = await getDaySlots("2026-10-16", { ...options, now: fridayAfternoon });
    expect(day?.slots.map((slot) => slot.time)).toEqual(["14:30", "15:30", "16:30", "17:30", "18:30", "19:30"]);
  });
});

describe("getTakenInstants / dayRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dia inteiro em São Paulo", () => {
    expect(dayRange("2026-10-16")).toEqual({
      gte: new Date("2026-10-16T03:00:00.000Z"),
      lt: new Date("2026-10-17T03:00:00.000Z"),
    });
  });

  it("junta reservas e bloqueios e devolve só as datas", async () => {
    const booked = new Date("2026-10-16T12:00:00.000Z");
    const blocked = new Date("2026-10-16T13:30:00.000Z");
    mocks.findMany.mockResolvedValue([{ date: booked }]);
    mocks.findBlocks.mockResolvedValue([{ date: blocked }]);

    expect(await getTakenInstants("shop-1", dayRange("2026-10-16"))).toEqual([booked, blocked]);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { barbershopId: "shop-1", date: dayRange("2026-10-16") },
      select: { date: true },
    });
  });
});
