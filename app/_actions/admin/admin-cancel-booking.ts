"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { AdminActionResult, adminFail, adminOk, isAdminSession } from "@/app/_lib/admin-actions";
import { runInBackground } from "@/app/_lib/notifications/background";
import { LoadedBooking, loadBookingSnapshot, notifyBookingCancelled } from "@/app/_lib/notifications/notify";

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

  let booking: LoadedBooking | null;
  try {
    // Lida com usuário, serviço e barbearia: depois do delete a reserva some (aviso ao cliente).
    booking = await loadBookingSnapshot(parsed.data);
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

  // "O Cris cancelou sua reserva", depois do commit e em segundo plano (nunca impede o cancelamento).
  const cancelled = booking;
  runInBackground(() => notifyBookingCancelled(cancelled, true));

  return adminOk("Reserva cancelada. O horário voltou a ficar livre.");
};
