import { Prisma } from "@prisma/client";

type LockClient = Pick<Prisma.TransactionClient, "$executeRaw">;

// Chave do horário: barbearia + instante em UTC. A mesma em saveBooking, reserva manual,
// bloquear horário e bloquear dia.
export const slotLockKey = (barbershopId: string, instant: Date): string =>
  `slot:${barbershopId}:${instant.toISOString()}`;

// Trava o horário até o fim da transação (pg_advisory_xact_lock). SlotBlock e Booking são tabelas
// diferentes: sem a trava, bloquear e reservar o mesmo horário ao mesmo tempo gravaria os dois.
// $executeRaw porque pg_advisory_xact_lock devolve void (o $queryRaw não lê esse tipo).
export const lockSlot = (tx: LockClient, barbershopId: string, instant: Date): Promise<void> =>
  lockKey(tx, slotLockKey(barbershopId, instant));

// Mesma trava para outras chaves: o mensalista (pagamento, pausa, exclusão) e o horário fixo
// (dois mensalistas ativos no mesmo dia e horário).
export const lockKey = async (tx: LockClient, key: string): Promise<void> => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
};

export const mensalistaLockKey = (mensalistaId: string): string => `mensalista:${mensalistaId}`;

export const fixedSlotLockKey = (fixedDay: number, fixedTime: string): string => `mensalista-fixo:${fixedDay}:${fixedTime}`;
