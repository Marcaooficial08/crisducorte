"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { assertUser } from "../_lib/auth-guards";

export const cancelBooking = async (bookingId: string) => {
  const user = assertUser(await getServerSession(authOptions));

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
};
