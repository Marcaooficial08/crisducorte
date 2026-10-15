"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { assertUser } from "../_lib/auth-guards";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "../_lib/rate-limit";

export const cancelBooking = async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
  const user = assertUser(await getServerSession(authOptions));

  // Retorna em vez de lançar: em produção o Next esconde a mensagem dos erros.
  if (!checkRateLimit(`cancel-booking:${user.id}`)) {
    return { success: false, error: RATE_LIMIT_MESSAGE };
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Reserva não encontrada.");
  }

  const isOwner = user.id === booking.userId;

  if (!isOwner && !user.isAdmin) {
    throw new Error("Sem permissão para cancelar esta reserva.");
  }

  await db.booking.delete({
    where: { id: bookingId },
  });

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/adm");

  return { success: true };
};
