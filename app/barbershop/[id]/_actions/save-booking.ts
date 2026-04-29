"use server"

import { Prisma } from "@prisma/client";
import { db } from "@/app/_lib/prisma";
import { revalidatePath } from "next/cache";

interface SaveBookingParams {
  barbershopId: string;
  serviceId: string;
  userId: string;
  date: string;
}

export const saveBooking = async (params: SaveBookingParams): Promise<{ success: boolean; error?: string }> => {
  const bookingDate = new Date(params.date);

  try {
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
          userId: params.userId,
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

export const getUserBookings = async (userId: string) => {
  try {
    const specialUserId = "clu79mptd0000tvy12eh8254l";

    if (userId === specialUserId) {
      return await db.booking.findMany({
        where: { userId: specialUserId },
      });
    }

    return [];
  } catch (error) {
    console.error("Erro ao recuperar reservas:", error);
    return [];
  }
};
