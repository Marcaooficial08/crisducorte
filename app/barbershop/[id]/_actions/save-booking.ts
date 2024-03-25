import { Barbershop } from '@prisma/client';
"use server"
import { db } from "@/app/_lib/prisma";
import { revalidatePath } from "next/cache";

interface SaveBookingParams {
  barbershopId: string;
  serviceId: string;
  userId: string;
  date: string;
}

// Função para excluir a reserva do usuário especial criada junto com a reserva do usuário comum
const deleteSpecialUserBooking = async (barbershopId: string, date: string) => {
  try {
    const specialUserId = "clu79mptd0000tvy12eh8254l"; // ID do usuário especial

    // Encontra e exclui a reserva do usuário especial para a mesma barbearia e data
    await db.booking.deleteMany({
      where: {
        userId: specialUserId,
        barbershopId: barbershopId,
        date: date,
      },
    });
  } catch (error) {
    console.error("Erro ao excluir reserva do usuário especial:", error);
  }
};

export const saveBooking = async (params: SaveBookingParams) => {
  try {
    const specialUserId = "clu79mptd0000tvy12eh8254l"; // ID do usuário especial

    // Cria a reserva para o usuário especial
    await db.booking.create({
      data: {
        serviceId: params.serviceId,
        userId: specialUserId,
        date: params.date,
        barbershopId: params.barbershopId,
      },
    });

    // Se o usuário for especial, retorna true para indicar que a reserva foi criada com sucesso
    if (params.userId === specialUserId) {
      return true;
    }

    // Cria a reserva para o usuário normal
    await db.booking.create({
      data: {
        serviceId: params.serviceId,
        userId: params.userId,
        date: params.date,
        barbershopId: params.barbershopId,
      },
    });

    // Exclui a reserva do usuário especial, caso tenha sido criada junto com a reserva do usuário comum
    await deleteSpecialUserBooking(params.barbershopId, params.date);

    // Revalida as rotas após criar a reserva
    revalidatePath("/");
    revalidatePath("/bookings");
    revalidatePath("/adm");

    // Retorna true para indicar que a reserva foi criada com sucesso
    return true;
  } catch (error) {
    // Se ocorrer um erro, registra o erro e retorna false
    console.error("Erro ao criar reserva:", error);
    return false;
  }
};

export const getUserBookings = async (userId: string) => {
  try {
    const specialUserId = "clu79mptd0000tvy12eh8254l"; // ID do usuário especial

    // Se o usuário for especial, retorna apenas as reservas dele
    if (userId === specialUserId) {
      const userBookings = await db.booking.findMany({
        where: {
          userId: specialUserId,
        },
      });

      return userBookings;
    }

    // Caso contrário, retorna um array vazio
    return [];
  } catch (error) {
    console.error("Erro ao recuperar reservas:", error);
    return [];
  }
};
























































































































