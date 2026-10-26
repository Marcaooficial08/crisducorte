"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { AuthError, SessionUser, assertUser } from "../_lib/auth-guards";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "../_lib/rate-limit";
import { runInBackground } from "../_lib/notifications/background";
import { loadBookingSnapshot, notifyBookingCancelled } from "../_lib/notifications/notify";

type CancelResult = { success: boolean; error?: string };

export const CANCEL_ERRORS = {
  UNAUTHENTICATED: "Faça login para cancelar.",
  INVALID: "Reserva inválida.",
  NOT_FOUND: "Reserva não encontrada.",
  FORBIDDEN: "Sem permissão para cancelar esta reserva.",
  PAST: "Essa reserva já passou e não pode ser cancelada.",
} as const;

const bookingIdSchema = z.string().min(1).max(64);

// Retorna em vez de lançar: em produção o Next esconde a mensagem dos erros.
export const cancelBooking = async (bookingId: string): Promise<CancelResult> => {
  let user: SessionUser;
  try {
    user = assertUser(await getServerSession(authOptions));
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: CANCEL_ERRORS.UNAUTHENTICATED };
    }
    throw error;
  }

  if (!checkRateLimit(`cancel-booking:${user.id}`)) {
    return { success: false, error: RATE_LIMIT_MESSAGE };
  }

  if (!bookingIdSchema.safeParse(bookingId).success) {
    return { success: false, error: CANCEL_ERRORS.INVALID };
  }

  // Lida com usuário, serviço e barbearia: depois do delete a reserva some (aviso por e-mail).
  const booking = await loadBookingSnapshot(bookingId);

  if (!booking) {
    return { success: false, error: CANCEL_ERRORS.NOT_FOUND };
  }

  const isOwner = user.id === booking.userId;

  if (!isOwner && !user.isAdmin) {
    return { success: false, error: CANCEL_ERRORS.FORBIDDEN };
  }

  // Reserva que já passou é histórico (métricas): o cliente não apaga; o admin pode.
  if (!user.isAdmin && booking.date.getTime() <= Date.now()) {
    return { success: false, error: CANCEL_ERRORS.PAST };
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
