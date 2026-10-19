"use server";

import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { getTakenInstants } from "@/app/_lib/availability";

const TZ = "America/Sao_Paulo";

// Horários ocupados do dia (reservas + bloqueios), só as datas: a action é pública e a resposta vai
// para o navegador, então nada de nome, telefone ou userId de outros clientes.
export const getDayBookings = async (barbershopId: string, date: Date): Promise<{ date: Date }[]> => {
  // Convert the selected date to SP timezone to get correct day boundaries,
  // then convert back to UTC for the Postgres query.
  const zonedDate = toZonedTime(date, TZ);
  const startUTC = fromZonedTime(startOfDay(zonedDate), TZ);
  const endUTC = fromZonedTime(endOfDay(zonedDate), TZ);

  const instants = await getTakenInstants(barbershopId, { gte: startUTC, lte: endUTC });

  return instants.map((instant) => ({ date: instant }));
};
