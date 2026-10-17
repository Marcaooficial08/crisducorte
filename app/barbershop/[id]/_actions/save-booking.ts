"use server"

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { db } from "@/app/_lib/prisma";
import { authOptions } from "@/app/_lib/auth";
import { AuthError, assertUser } from "@/app/_lib/auth-guards";
import { checkRateLimit } from "@/app/_lib/rate-limit";
import { isAgendaV2Enabled } from "@/app/_lib/flags";
import { isBookableSlot } from "@/app/_lib/schedule";
import { BOOKING_ERROR_MESSAGES, BookingErrorCode } from "@/app/_lib/booking-errors";
import { revalidatePath } from "next/cache";

interface SaveBookingParams {
  barbershopId: string;
  serviceId: string;
  date: string;
}

type SaveBookingResult = { success: true } | { success: false; code: BookingErrorCode; error: string };

const fail = (code: BookingErrorCode): SaveBookingResult => ({ success: false, code, error: BOOKING_ERROR_MESSAGES[code] });

export const saveBooking = async (params: SaveBookingParams): Promise<SaveBookingResult> => {
  const bookingDate = new Date(params.date);

  try {
    // userId sempre da sessão, nunca do navegador.
    const session = await getServerSession(authOptions);
    const user = assertUser(session);

    if (!checkRateLimit(`save-booking:${user.id}`)) {
      return fail("RATE_LIMIT");
    }

    // Agenda nova: só dias liberados, horários da grade e ainda por vir.
    if (isAgendaV2Enabled(session) && !isBookableSlot(bookingDate, new Date())) {
      return fail("SLOT_UNAVAILABLE");
    }

    await db.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({
        where: {
          barbershopId: params.barbershopId,
          date: bookingDate,
        },
      });

      if (existing) {
        throw new Error("SLOT_TAKEN");
      }

      await tx.booking.create({
        data: {
          serviceId: params.serviceId,
          userId: user.id,
          date: bookingDate,
          barbershopId: params.barbershopId,
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/bookings");
    revalidatePath("/adm");

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("UNAUTHENTICATED");
    }
    // Horário tomado: achado na consulta ou barrado pelo @@unique (P2002) quando os dois gravam juntos.
    if (
      (error instanceof Error && error.message === "SLOT_TAKEN") ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      return fail("SLOT_TAKEN");
    }
    console.error("Erro ao criar reserva:", error);
    return fail("GENERIC");
  }
};
