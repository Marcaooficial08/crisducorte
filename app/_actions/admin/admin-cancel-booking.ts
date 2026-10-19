"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { AdminActionResult, adminFail, adminOk, isAdminSession } from "@/app/_lib/admin-actions";

const bookingIdSchema = z.string().min(1);

// Cancelamento pelo painel: apaga a reserva e grava BookingCancellation (byAdmin = true sempre,
// decisão do dono no Prompt 17) com o source original, na mesma transação.
export const adminCancelBooking = async (bookingId: string): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = bookingIdSchema.safeParse(bookingId);
  if (!parsed.success) {
    return adminFail("INVALID");
  }

  try {
    const booking = await db.booking.findUnique({ where: { id: parsed.data } });
    if (!booking) {
      return adminFail("NOT_FOUND");
    }

    await db.$transaction([
      db.bookingCancellation.create({
        data: { bookingId: booking.id, date: booking.date, byAdmin: true, source: booking.source },
      }),
      db.booking.delete({ where: { id: booking.id } }),
    ]);
  } catch (error) {
    // Cancelada ao mesmo tempo por outra pessoa: o delete não acha a reserva e nada é gravado.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return adminFail("NOT_FOUND");
    }
    console.error("Erro ao cancelar reserva (admin):", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/adm");
  return adminOk("Reserva cancelada. O horário voltou a ficar livre.");
};
