"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";

export const cancelBooking = async (bookingId: string) => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Não autenticado.");
  }

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Reserva não encontrada.");
  }

  const isOwner = session.user.id === booking.userId;
  const isAdmin = session.user.hasFullAccess === true;

  if (!isOwner && !isAdmin) {
    throw new Error("Sem permissão para cancelar esta reserva.");
  }

  await db.booking.delete({
    where: { id: bookingId },
  });

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/adm");
};
