import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }));

// Sessão simulada; banco real (TEST_DATABASE_URL).
vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/app/_lib/auth", () => ({ authOptions: {} }));

import { db } from "@/app/_lib/prisma";
import { resetRateLimit } from "@/app/_lib/rate-limit";
import { SLOT_UNAVAILABLE_MESSAGE } from "@/app/_lib/schedule";
import { saveBooking } from "@/app/_actions/save-booking";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, service, clienteA } = FIXTURES;

// Horário de São Paulo (UTC-3) → ISO em UTC.
const sp = (isoLocal: string) => new Date(`${isoLocal}-03:00`).toISOString();

// Semana de seg 31/12/2029 a dom 06/01/2030: liberados sexta 04/01 e sábado 05/01.
const WEDNESDAY_NOON = sp("2030-01-02T12:00:00");
const FRIDAY_2PM = sp("2030-01-04T14:00:00");

// Reserva antiga fora da regra nova (quinta), criada direto no banco.
const LEGACY_SLOT = sp("2030-01-03T10:00:00");

const book = (date: string) => {
  mocks.getServerSession.mockResolvedValueOnce({
    user: { ...clienteA, isAdmin: false },
    expires: "2999-01-01T00:00:00.000Z",
  });
  return saveBooking({ barbershopId: barbershop.id, serviceId: service.id, date });
};

describe("saveBooking com a regra da agenda (banco real, relógio fixo)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimit();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(WEDNESDAY_NOON));
    await resetDatabase(db);
    await seedFixtures(db);
    await db.booking.create({
      data: { barbershopId: barbershop.id, serviceId: service.id, userId: clienteA.id, date: new Date(LEGACY_SLOT) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const expectOnlyLegacyBooking = async () => {
    const bookings = await db.booking.findMany();
    expect(bookings).toHaveLength(1);
    expect(bookings[0].date).toEqual(new Date(LEGACY_SLOT));
  };

  it("recusa o sábado da semana seguinte", async () => {
    const result = await book(sp("2030-01-12T09:00:00"));

    expect(result).toEqual({ success: false, code: "SLOT_UNAVAILABLE", error: SLOT_UNAVAILABLE_MESSAGE });
    await expectOnlyLegacyBooking();
  });

  it("recusa horário fora da grade", async () => {
    const result = await book(sp("2030-01-04T10:00:00"));

    expect(result).toEqual({ success: false, code: "SLOT_UNAVAILABLE", error: SLOT_UNAVAILABLE_MESSAGE });
    await expectOnlyLegacyBooking();
  });

  it("recusa horário que já passou", async () => {
    vi.setSystemTime(new Date(FRIDAY_2PM));

    const result = await book(sp("2030-01-04T09:00:00"));

    expect(result).toEqual({ success: false, code: "SLOT_UNAVAILABLE", error: SLOT_UNAVAILABLE_MESSAGE });
    await expectOnlyLegacyBooking();
  });

  it("aceita horário liberado e mantém a reserva antiga fora da regra", async () => {
    vi.setSystemTime(new Date(FRIDAY_2PM));

    const result = await book(sp("2030-01-04T14:30:00"));

    expect(result).toEqual({ success: true });
    const bookings = await db.booking.findMany({ orderBy: { date: "asc" } });
    expect(bookings.map((b) => b.date)).toEqual([new Date(LEGACY_SLOT), new Date(sp("2030-01-04T14:30:00"))]);
  });

  it("recusa horário bloqueado (SlotBlock) e aceita o vizinho livre", async () => {
    await db.slotBlock.create({ data: { date: new Date(sp("2030-01-05T10:30:00")), reason: "teste" } });

    expect(await book(sp("2030-01-05T10:30:00"))).toEqual({ success: false, code: "SLOT_UNAVAILABLE", error: SLOT_UNAVAILABLE_MESSAGE });
    await expectOnlyLegacyBooking();
    expect(await book(sp("2030-01-05T11:30:00"))).toEqual({ success: true });
  });
});
