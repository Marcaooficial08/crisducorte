import { db } from "@/app/_lib/prisma";

export interface WeeklyBookings {
  // Segunda-feira da semana, em UTC (YYYY-MM-DD).
  semana: string;
  total: number;
}

export interface BookingMetrics {
  confirmadas: number;
  porSemana: WeeklyBookings[];
}

const weekStartUTC = (date: Date) => {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // getUTCDay: domingo = 0; recua até a segunda-feira.
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
};

// Métricas de reserva lidas do próprio banco (independem do plano da Vercel).
// Conta reservas com `date` entre `desde` e `ate` (inclusive).
//
// Canceladas ainda não são contadas: hoje o cancelamento apaga a reserva
// (`app/_actions/cancel-booking.ts`), então não há registro delas no banco.
// Toda reserva existente é considerada confirmada.
export const getBookingMetrics = async (desde: Date, ate: Date): Promise<BookingMetrics> => {
  const bookings = await db.booking.findMany({
    where: { date: { gte: desde, lte: ate } },
    select: { date: true },
  });

  const weeks = new Map<string, number>();
  for (const { date } of bookings) {
    const semana = weekStartUTC(date);
    weeks.set(semana, (weeks.get(semana) ?? 0) + 1);
  }

  return {
    confirmadas: bookings.length,
    porSemana: Array.from(weeks, ([semana, total]) => ({ semana, total })).sort((a, b) =>
      a.semana.localeCompare(b.semana),
    ),
  };
};
