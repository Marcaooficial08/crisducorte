import { PrismaClient } from "@prisma/client";

// Dados fixos do banco de teste (integração e e2e).
export const FIXTURES = {
  barbershop: { id: "test-shop", name: "Cris du Corte Teste", address: "Rua dos Testes, 1" },
  service: { id: "test-service", name: "Corte de Cabelo", description: "Corte de teste", price: 40 },
  clienteA: { id: "test-cliente-a", name: "Cliente A", email: "cliente-a@teste.local", sessionToken: "e2e-session-cliente-a" },
  clienteB: { id: "test-cliente-b", name: "Cliente B", email: "cliente-b@teste.local", sessionToken: "e2e-session-cliente-b" },
  admin: { id: "test-admin", name: "Admin Teste", email: "admin@teste.local", sessionToken: "e2e-session-admin" },
} as const;

const IMAGE_URL = "https://utfs.io/f/0ddfbd26-a424-43a0-aaf3-c3f1dc6be6d1-1kgxo7.png";

export const resetDatabase = async (db: PrismaClient) => {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "PushSubscription", "NotificationLog", "BookingCancellation", "SlotBlock", "Booking", "MensalistaCycle", "Mensalista", "Session", "Account", "User", "Service", "Barbershop" CASCADE',
  );
};

export const seedFixtures = async (db: PrismaClient) => {
  const { barbershop, service, clienteA, clienteB, admin } = FIXTURES;
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.barbershop.create({ data: { ...barbershop, imageUrl: IMAGE_URL } });
  await db.service.create({ data: { ...service, barbershopId: barbershop.id, imageUrl: IMAGE_URL } });

  for (const user of [clienteA, clienteB, admin]) {
    await db.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user === admin,
        sessions: { create: { sessionToken: user.sessionToken, expires } },
      },
    });
  }
};
