"use server"

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { db } from "@/app/_lib/prisma";
import { authOptions } from "@/app/_lib/auth";
import { AuthError, assertUser } from "@/app/_lib/auth-guards";
import { checkRateLimit } from "@/app/_lib/rate-limit";
import { isAgendaV2Enabled, isNewHomeEnabled } from "@/app/_lib/flags";
import { getNow } from "@/app/_lib/schedule";
import { visibleBarbershopWhere } from "@/app/_lib/barbershops";
import { SlotStatus, getInstantStatus, getSlotStatus, slotFromInstant } from "@/app/_lib/availability";
import { lockSlot } from "@/app/_lib/slot-lock";
import { INTERACTIVE_TX_OPTIONS, isTransactionTimeout } from "@/app/_lib/transaction";
import { BOOKING_ERROR_MESSAGES, BookingErrorCode } from "@/app/_lib/booking-errors";
import { revalidatePath } from "next/cache";
import { runInBackground } from "@/app/_lib/notifications/background";
import { notifyBookingCreated } from "@/app/_lib/notifications/notify";

interface SaveBookingParams {
  barbershopId: string;
  serviceId: string;
  date: string;
}

type SaveBookingResult = { success: true } | { success: false; code: BookingErrorCode; error: string };

const fail = (code: BookingErrorCode): SaveBookingResult => ({ success: false, code, error: BOOKING_ERROR_MESSAGES[code] });

// Entrada do navegador (Prompt 22): ids curtos e data ISO em UTC, como o toISOString() da tela.
const paramsSchema = z.object({
  barbershopId: z.string().min(1).max(64),
  serviceId: z.string().min(1).max(64),
  date: z.string().datetime(),
});

export const saveBooking = async (input: SaveBookingParams): Promise<SaveBookingResult> => {
  try {
    // userId sempre da sessão, nunca do navegador.
    const session = await getServerSession(authOptions);
    const user = assertUser(session);

    if (!checkRateLimit(`save-booking:${user.id}`)) {
      return fail("RATE_LIMIT");
    }

    const parsed = paramsSchema.safeParse(input);
    if (!parsed.success) {
      return fail("INVALID");
    }
    const params = parsed.data;
    const bookingDate = new Date(params.date);

    // O serviço tem de ser da barbearia, e a barbearia tem de estar visível (não reserva na "Indisponivel").
    const service = await db.service.findFirst({
      where: { id: params.serviceId, barbershopId: params.barbershopId, barbershop: visibleBarbershopWhere },
      select: { id: true },
    });
    if (!service) {
      return fail("INVALID");
    }

    // Agenda nova (AGENDA_V2 ou home nova): só dias liberados, horários da grade e ainda por vir.
    const useSchedule = isAgendaV2Enabled(session) || isNewHomeEnabled(session);
    const slot = slotFromInstant(bookingDate);
    if (useSchedule && !slot) {
      return fail("SLOT_UNAVAILABLE");
    }

    const booking = await db.$transaction(async (tx) => {
      // Mesma trava do painel do admin: bloqueio e reserva do mesmo horário não gravam juntos.
      await lockSlot(tx, params.barbershopId, bookingDate);

      // Disponibilidade pelo ponto único (app/_lib/availability.ts). Flags desligadas: só reserva e
      // bloqueio no instante exato, como a agenda antiga (data montada no navegador).
      const status: SlotStatus =
        useSchedule && slot
          ? await getSlotStatus(slot.date, slot.time, { barbershopId: params.barbershopId, now: getNow(), client: tx })
          : await getInstantStatus(params.barbershopId, bookingDate, tx);

      if (status === "TAKEN") {
        throw new Error("SLOT_TAKEN");
      }
      if (status !== "AVAILABLE") {
        throw new Error("SLOT_UNAVAILABLE");
      }

      return tx.booking.create({
        data: {
          serviceId: params.serviceId,
          userId: user.id,
          date: bookingDate,
          barbershopId: params.barbershopId,
        },
        select: { id: true },
      });
    }, INTERACTIVE_TX_OPTIONS);

    revalidatePath("/");
    revalidatePath("/bookings");
    revalidatePath("/adm");

    // Depois do commit e em segundo plano: falha no e-mail nunca desfaz nem atrasa a reserva.
    runInBackground(() => notifyBookingCreated(booking.id));

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
    if (error instanceof Error && error.message === "SLOT_UNAVAILABLE") {
      return fail("SLOT_UNAVAILABLE");
    }
    if (isTransactionTimeout(error)) {
      return fail("BUSY");
    }
    console.error("Erro ao criar reserva:", error);
    return fail("GENERIC");
  }
};
