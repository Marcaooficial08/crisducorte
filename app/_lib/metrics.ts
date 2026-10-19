import { db } from "@/app/_lib/prisma";

export interface WeeklyBookings {
  // Segunda-feira da semana, em UTC (YYYY-MM-DD).
  semana: string;
  total: number;
  canceladas: number;
}

export interface BookingMetrics {
  confirmadas: number;
  canceladas: number;
  porSemana: WeeklyBookings[];
}

const weekStartUTC = (date: Date) => {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // getUTCDay: domingo = 0; recua até a segunda-feira.
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
};

// Data em que o registro de cancelamentos (BookingCancellation) começou a valer em produção.
export const CANCELLATIONS_SINCE_LABEL = "19/10/2026";

export interface MetricsWindow {
  desde: Date;
  ate: Date;
  // Segundas-feiras (YYYY-MM-DD, UTC) de cada semana da janela, da mais antiga para a atual.
  semanas: string[];
}

// Semana atual + as `previousWeeks` anteriores, de segunda 00:00 a domingo 23:59:59.999 (UTC),
// a mesma semana de getBookingMetrics.
export const recentWeeksWindow = (now: Date, previousWeeks = 4): MetricsWindow => {
  const currentMonday = new Date(`${weekStartUTC(now)}T00:00:00.000Z`);
  const desde = new Date(currentMonday);
  desde.setUTCDate(desde.getUTCDate() - 7 * previousWeeks);
  const ate = new Date(currentMonday);
  ate.setUTCDate(ate.getUTCDate() + 7);
  ate.setUTCMilliseconds(-1);

  const semanas = Array.from({ length: previousWeeks + 1 }, (_, index) => {
    const monday = new Date(desde);
    monday.setUTCDate(monday.getUTCDate() + 7 * index);
    return monday.toISOString().slice(0, 10);
  });
  return { desde, ate, semanas };
};

// Métricas de reserva lidas do próprio banco (independem do plano da Vercel).
// Conta reservas com `date` (data do horário) entre `desde` e `ate` (inclusive).
//
// Toda reserva existente é considerada confirmada. O cancelamento apaga a reserva
// (`app/_actions/cancel-booking.ts`) e grava uma linha em BookingCancellation, contada aqui
// pela data do horário cancelado. Cancelamentos anteriores à Fase 3 não têm registro.
export const getBookingMetrics = async (desde: Date, ate: Date): Promise<BookingMetrics> => {
  const where = { date: { gte: desde, lte: ate } };
  const [bookings, cancellations] = await Promise.all([
    db.booking.findMany({ where, select: { date: true } }),
    db.bookingCancellation.findMany({ where, select: { date: true } }),
  ]);

  const weeks = new Map<string, WeeklyBookings>();
  const weekOf = (date: Date) => {
    const semana = weekStartUTC(date);
    const week = weeks.get(semana) ?? { semana, total: 0, canceladas: 0 };
    weeks.set(semana, week);
    return week;
  };
  for (const { date } of bookings) {
    weekOf(date).total += 1;
  }
  for (const { date } of cancellations) {
    weekOf(date).canceladas += 1;
  }

  return {
    confirmadas: bookings.length,
    canceladas: cancellations.length,
    porSemana: Array.from(weeks.values()).sort((a, b) => a.semana.localeCompare(b.semana)),
  };
};
