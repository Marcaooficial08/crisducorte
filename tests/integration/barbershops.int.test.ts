import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/app/_lib/prisma";
import { visibleBarbershopWhere } from "@/app/_lib/barbershops";
import { FIXTURES, resetDatabase, seedFixtures } from "../setup/fixtures";

const { barbershop, clienteA } = FIXTURES;

const HIDDEN_ID = "test-shop-indisponivel";

describe("barbearias visíveis no banco real", () => {
  beforeEach(async () => {
    await resetDatabase(db);
    await seedFixtures(db);
    await db.barbershop.create({
      data: { id: HIDDEN_ID, name: "Indisponivel", address: "—", imageUrl: "https://utfs.io/f/x.png" },
    });
    const service = await db.service.create({
      data: { name: "Corte antigo", description: "—", price: 30, barbershopId: HIDDEN_ID, imageUrl: "https://utfs.io/f/x.png" },
    });
    await db.booking.create({
      data: { userId: clienteA.id, date: new Date("2024-05-17T13:30:00.000Z"), barbershopId: HIDDEN_ID, serviceId: service.id },
    });
  });

  it("listagem esconde a Indisponivel e mantém as outras", async () => {
    const list = await db.barbershop.findMany({ where: visibleBarbershopWhere });
    expect(list.map((b) => b.id)).toEqual([barbershop.id]);
  });

  it("a Indisponivel continua no banco, com as reservas, e abre pelo id", async () => {
    const shop = await db.barbershop.findUnique({ where: { id: HIDDEN_ID }, include: { bookings: true } });
    expect(shop?.name).toBe("Indisponivel");
    expect(shop?.bookings).toHaveLength(1);
  });
});
