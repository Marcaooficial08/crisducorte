import { PrismaClient } from "@prisma/client";
import { loadEnv } from "vite";
import { resolveTestDatabaseUrl } from "../tests/setup/test-database-url";
import { FIXTURES } from "../tests/setup/fixtures";

// Dados só do e2e. Cada teste usa os seus, para não depender da ordem nem de um retry.
export const E2E = {
  // Segundo cliente do teste de dois clientes no mesmo horário (o cliente B é excluído no lgpd.spec).
  clienteC: { id: "test-cliente-c", name: "Cliente C", email: "cliente-c@teste.local", sessionToken: "e2e-session-cliente-c" },
  // Reserva passada do cliente C: o admin sempre tem o que ver em /adm.
  pastBookingDate: new Date("2026-01-02T15:00:00.000Z"),
  // Sessão extra do cliente C, criada pelo teste do "Sair" (o signOut apaga a sessão no banco).
  logoutSessionToken: "e2e-session-cliente-c-sair",
  // Reserva passada do próprio admin, criada só no teste do menu (o estados.spec usa o admin sem reservas).
  adminBookingDate: new Date("2026-01-03T15:00:00.000Z"),
} as const;

export const testDb = () => {
  const url = resolveTestDatabaseUrl({ ...loadEnv("test", process.cwd(), ""), ...process.env });
  if (!url) {
    throw new Error("TEST_DATABASE_URL ausente.");
  }
  return new PrismaClient({ datasourceUrl: url });
};

export const seedE2eFixtures = async (db: PrismaClient) => {
  const { clienteC, pastBookingDate } = E2E;
  await db.user.create({
    data: {
      id: clienteC.id,
      name: clienteC.name,
      email: clienteC.email,
      sessions: { create: { sessionToken: clienteC.sessionToken, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) } },
    },
  });
  await db.booking.create({
    data: {
      userId: clienteC.id,
      serviceId: FIXTURES.service.id,
      barbershopId: FIXTURES.barbershop.id,
      date: pastBookingDate,
    },
  });
};

// Libera um horário antes do teste que vai reservá-lo (reexecução ou retry no CI).
export const freeSlot = async (date: Date) => {
  const db = testDb();
  try {
    await db.booking.deleteMany({ where: { barbershopId: FIXTURES.barbershop.id, date } });
  } finally {
    await db.$disconnect();
  }
};
