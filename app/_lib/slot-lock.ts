import { Prisma } from "@prisma/client";

type LockClient = Pick<Prisma.TransactionClient, "$executeRaw">;

// Chave do horário: barbearia + instante em UTC. A mesma em saveBooking, reserva manual,
// bloquear horário e bloquear dia.
export const slotLockKey = (barbershopId: string, instant: Date): string =>
  `slot:${barbershopId}:${instant.toISOString()}`;

// Trava o horário até o fim da transação (pg_advisory_xact_lock). SlotBlock e Booking são tabelas
// diferentes: sem a trava, bloquear e reservar o mesmo horário ao mesmo tempo gravaria os dois.
// $executeRaw porque pg_advisory_xact_lock devolve void (o $queryRaw não lê esse tipo).
export const lockSlot = async (tx: LockClient, barbershopId: string, instant: Date): Promise<void> => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${slotLockKey(barbershopId, instant)}, 0))`;
};
