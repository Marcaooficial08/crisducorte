import { Prisma } from "@prisma/client";
import { db } from "@/app/_lib/prisma";

interface NextBookingUser {
  id: string;
  email?: string | null;
}

// "Meu próximo agendamento" da home nova: a próxima reserva do próprio cliente e, com a flag
// MENSALISTAS, também a de mensalista cujo e-mail é o da conta (D4j). A reserva de mensalista
// não tem userId: o cliente vê, mas não cancela pelo app.
export const getNextBooking = (user: NextBookingUser, now: Date, includeMensalista: boolean) => {
  const owners: Prisma.BookingWhereInput[] = [{ userId: user.id }];
  if (includeMensalista && user.email) {
    owners.push({
      source: "MENSALISTA",
      mensalista: { is: { email: { equals: user.email, mode: "insensitive" }, status: "ATIVO" } },
    });
  }
  return db.booking.findFirst({
    where: { date: { gte: now }, OR: owners },
    include: { service: true },
    orderBy: { date: "asc" },
  });
};
