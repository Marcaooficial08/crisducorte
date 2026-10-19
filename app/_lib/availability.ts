import { Prisma } from "@prisma/client";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { db } from "@/app/_lib/prisma";
import { DaySlots, TIME_ZONE, getNextServiceDays, getNow, serviceDayLabel } from "@/app/_lib/schedule";

// Disponibilidade de um horário (spec §5): está na grade e nos dias liberados, não tem Booking
// e não tem SlotBlock. Ponto único para a home nova, a /barbershop/[id], o saveBooking, o painel do
// admin e (depois) os mensalistas.

type DbClient = Pick<Prisma.TransactionClient, "booking" | "slotBlock">;

export interface AvailabilityOptions {
  barbershopId: string;
  now?: Date;
  // Para rodar dentro de uma transação (ex.: saveBooking).
  client?: DbClient;
}

export type InstantStatus = "AVAILABLE" | "TAKEN" | "BLOCKED";
export type SlotStatus = InstantStatus | "OUTSIDE_SCHEDULE";

// "2026-10-16" + "09:00" (fuso de São Paulo) → instante gravado em Booking.date / SlotBlock.date.
export const slotInstant = (date: string, time: string): Date => fromZonedTime(`${date}T${time}:00`, TIME_ZONE);

// Instante → { date, time } no fuso de São Paulo; null se inválido ou fora do minuto exato.
export const slotFromInstant = (instant: Date): { date: string; time: string } | null => {
  if (Number.isNaN(instant.getTime()) || instant.getUTCSeconds() !== 0 || instant.getUTCMilliseconds() !== 0) {
    return null;
  }
  return {
    date: formatInTimeZone(instant, TIME_ZONE, "yyyy-MM-dd"),
    time: formatInTimeZone(instant, TIME_ZONE, "HH:mm"),
  };
};

// Só reserva e bloqueio naquele instante, sem a regra da agenda.
// Usada pelo saveBooking com as flags desligadas (agenda antiga, data montada no navegador).
export const getInstantStatus = async (
  barbershopId: string,
  instant: Date,
  client: DbClient = db,
): Promise<InstantStatus> => {
  const booking = await client.booking.findFirst({ where: { barbershopId, date: instant }, select: { id: true } });
  if (booking) {
    return "TAKEN";
  }
  const block = await client.slotBlock.findUnique({ where: { date: instant }, select: { id: true } });
  return block ? "BLOCKED" : "AVAILABLE";
};

export const getSlotStatus = async (date: string, time: string, options: AvailabilityOptions): Promise<SlotStatus> => {
  const day = getNextServiceDays(options.now ?? getNow()).find((serviceDay) => serviceDay.date === date);
  if (!day || !day.times.includes(time)) {
    return "OUTSIDE_SCHEDULE";
  }
  return getInstantStatus(options.barbershopId, slotInstant(date, time), options.client);
};

export const isSlotAvailable = async (date: string, time: string, options: AvailabilityOptions): Promise<boolean> =>
  (await getSlotStatus(date, time, options)) === "AVAILABLE";

// Início (inclusive) e fim (exclusivo) de um dia no fuso de São Paulo.
export const dayRange = (date: string): { gte: Date; lt: Date } => {
  const nextDay = new Date(`${date}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return { gte: slotInstant(date, "00:00"), lt: slotInstant(nextDay.toISOString().slice(0, 10), "00:00") };
};

// Instantes ocupados (reserva da barbearia ou bloqueio) num intervalo. Só as datas: nada de dado
// pessoal, porque também vai para o navegador (getDayBookings da /barbershop/[id]).
export const getTakenInstants = async (
  barbershopId: string,
  range: { gte: Date; lt?: Date; lte?: Date },
  client: DbClient = db,
): Promise<Date[]> => {
  const [bookings, blocks] = await Promise.all([
    client.booking.findMany({ where: { barbershopId, date: range }, select: { date: true } }),
    client.slotBlock.findMany({ where: { date: range }, select: { date: true } }),
  ]);
  return [...bookings, ...blocks].map((item) => item.date);
};

// Horários de um dia liberado; null se o dia não está liberado agora.
// Reservado ou bloqueado aparece como ocupado (booked).
export const getDaySlots = async (date: string, options: AvailabilityOptions): Promise<DaySlots | null> => {
  const day = getNextServiceDays(options.now ?? getNow()).find((serviceDay) => serviceDay.date === date);
  if (!day) {
    return null;
  }

  const instants = await getTakenInstants(options.barbershopId, dayRange(date), options.client);
  const taken = new Set(instants.map((instant) => formatInTimeZone(instant, TIME_ZONE, "yyyy-MM-dd HH:mm")));
  const slots = day.times.map((time) => ({ time, booked: taken.has(`${date} ${time}`) }));

  return {
    date,
    label: serviceDayLabel(date),
    freeCount: slots.filter((slot) => !slot.booked).length,
    slots,
  };
};
