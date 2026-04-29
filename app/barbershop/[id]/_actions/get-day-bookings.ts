"use server";

import { db } from "@/app/_lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TZ = "America/Sao_Paulo";

export const getDayBookings = async (barbershopId: string, date: Date) => {
  // Convert the selected date to SP timezone to get correct day boundaries,
  // then convert back to UTC for the Postgres query.
  const zonedDate = toZonedTime(date, TZ);
  const startUTC = fromZonedTime(startOfDay(zonedDate), TZ);
  const endUTC = fromZonedTime(endOfDay(zonedDate), TZ);

  const bookings = await db.booking.findMany({
    where: {
      barbershopId,
      date: {
        gte: startUTC,
        lte: endUTC,
      },
    },
  });

  return bookings;
};
