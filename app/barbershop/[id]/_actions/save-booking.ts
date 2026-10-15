"use server"

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { db } from "@/app/_lib/prisma";
import { authOptions } from "@/app/_lib/auth";
import { AuthError, assertUser } from "@/app/_lib/auth-guards";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "@/app/_lib/rate-limit";
import { revalidatePath } from "next/cache";

interface SaveBookingParams {
  barbershopId: string;
  serviceId: string;
  date: string;
}

export const saveBooking = async (params: SaveBookingParams): Promise<{ success: boolean; error?: string }> => {
  const bookingDate = new Date(params.date);

  try {
    // userId sempre da sessão, nunca do navegador.
    const user = assertUser(await getServerSession(authOptions));

    if (!checkRateLimit(`save-booking:${user.id}`)) {
      return { success: false, error: RATE_LIMIT_MESSAGE };
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
      return { success: false, error: "Faça login para agendar." };
    }
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return { success: false, error: "Horário já reservado. Escolha outro." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Horário já reservado. Escolha outro." };
    }
    console.error("Erro ao criar reserva:", error);
    return { success: false, error: "Erro ao criar reserva. Tente novamente." };
  }
};
