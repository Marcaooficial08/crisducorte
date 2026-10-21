"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { assertUser } from "../_lib/auth-guards";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "../_lib/rate-limit";
import { runInBackground } from "../_lib/notifications/background";
import { loadBookingSnapshot, notifyBookingCancelled } from "../_lib/notifications/notify";

export const cancelBooking = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
  const user = assertUser(await getServerSession(authOptions));

  // Retorna em vez de lançar: em produção o Next esconde a mensagem dos erros.
  if (!checkRateLimit(`cancel-booking:${user.id}`)) {
    return { success: false, error: RATE_LIMIT_MESSAGE };
  }

  // Lida com usuário, serviço e barbearia: depois do delete a reserva some (aviso por e-mail).
  const booking = await loadBookingSnapshot(bookingId);

  if (!booking) {
    throw new Error("Reserva não encontrada.");
  }

  const isOwner = user.id === booking.userId;

  if (!isOwner && !user.isAdmin) {
    throw new Error("Sem permissão para cancelar esta reserva.");
  }

  // Continua apagando a reserva; o registro do cancelamento entra na mesma transação (métricas).
  // byAdmin só quando o admin cancela a reserva de outra pessoa.
  await db.$transaction([
    db.bookingCancellation.create({
      data: { bookingId: booking.id, date: booking.date, byAdmin: !isOwner, source: booking.source },
    }),
    db.booking.delete({
      where: { id: bookingId },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/adm");

  // Depois do commit e em segundo plano: falha no e-mail nunca impede o cancelamento.
  runInBackground(() => notifyBookingCancelled(booking, !isOwner));

  return { success: true };
};
