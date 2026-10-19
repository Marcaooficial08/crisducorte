import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findBookings: vi.fn(), findBlocks: vi.fn() }));

vi.mock("@/app/_lib/prisma", () => ({
  db: { booking: { findMany: mocks.findBookings }, slotBlock: { findMany: mocks.findBlocks } },
}));

import { getAdminAgenda } from "./admin-agenda";
import { TIME_GRID } from "./schedule";

// Quarta 14/10/2026 12:00 em São Paulo: semana aberta = sexta 16 e sábado 17.
const wednesday = new Date("2026-10-14T15:00:00.000Z");

describe("getAdminAgenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findBookings.mockResolvedValue([]);
    mocks.findBlocks.mockResolvedValue([]);
  });

  it("semana aberta: sexta e sábado com os 11 horários livres", async () => {
    const days = await getAdminAgenda("shop-1", wednesday);

    expect(days.map((day) => [day.date, day.label, day.freeCount])).toEqual([
      ["2026-10-16", "Sex 16", 11],
      ["2026-10-17", "Sáb 17", 11],
    ]);
    expect(days[0].slots.map((slot) => slot.time)).toEqual([...TIME_GRID]);
  });

  it("mostra o dono da reserva (customer-name), o telefone e o bloqueio com motivo", async () => {
    mocks.findBookings.mockImplementation(async ({ where }: { where: { date: { gte: Date } } }) =>
      where.date.gte.toISOString().startsWith("2026-10-16")
        ? [
            {
              id: "b1",
              date: new Date("2026-10-16T12:00:00.000Z"), // 09:00
              customerName: "João (na mão)",
              customerPhone: "11912345678",
              source: "MANUAL",
              service: { name: "Corte" },
              user: null,
            },
            {
              id: "b2",
              date: new Date("2026-10-16T14:30:00.000Z"), // 11:30
              customerName: null,
              customerPhone: null,
              source: "CLIENT",
              service: { name: "Barba" },
              user: { name: null },
            },
          ]
        : [],
    );
    mocks.findBlocks.mockImplementation(async ({ where }: { where: { date: { gte: Date } } }) =>
      where.date.gte.toISOString().startsWith("2026-10-16")
        ? [{ date: new Date("2026-10-16T13:30:00.000Z"), reason: "Médico" }] // 10:30
        : [],
    );

    const [friday] = await getAdminAgenda("shop-1", wednesday);

    expect(friday.freeCount).toBe(8);
    expect(friday.blockedCount).toBe(1);
    expect(friday.slots[0]).toEqual({
      time: "09:00",
      past: false,
      booking: { id: "b1", customerName: "João (na mão)", customerPhone: "11912345678", serviceName: "Corte", source: "MANUAL" },
      block: null,
    });
    expect(friday.slots[1]).toMatchObject({ time: "10:30", booking: null, block: { reason: "Médico" } });
    expect(friday.slots[2].booking?.customerName).toBe("Cliente");
  });

  it("sexta à tarde: horários que passaram aparecem como passados", async () => {
    const fridayAfternoon = new Date("2026-10-16T17:00:00.000Z"); // 14:00 em São Paulo

    const [friday] = await getAdminAgenda("shop-1", fridayAfternoon);

    expect(friday.slots.filter((slot) => slot.past).map((slot) => slot.time)).toEqual([
      "09:00",
      "10:30",
      "11:30",
      "12:30",
      "13:30",
    ]);
    expect(friday.freeCount).toBe(6);
  });

  it("domingo: nenhum dia", async () => {
    expect(await getAdminAgenda("shop-1", new Date("2026-10-18T15:00:00.000Z"))).toEqual([]);
  });
});
