"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { getSlotStatus, slotInstant } from "@/app/_lib/availability";
import { lockSlot } from "@/app/_lib/slot-lock";
import { normalizePhone } from "@/app/_lib/phone";
import { getNow, serviceDayLabel } from "@/app/_lib/schedule";
import {
  AdminActionError,
  AdminActionResult,
  adminFail,
  adminOk,
  dateSchema,
  getPanelBarbershop,
  isAdminSession,
  timeSchema,
} from "@/app/_lib/admin-actions";

const inputSchema = z.object({
  date: dateSchema,
  time: timeSchema,
  serviceId: z.string().min(1),
  customerName: z.string(),
  customerPhone: z.string(),
});

// Reserva feita pelo Cris no painel (spec §4.4): nome + WhatsApp, sem conta Google.
// source = MANUAL, userId = null. Mesma disponibilidade e mesma trava do saveBooking.
export const createManualBooking = async (input: z.input<typeof inputSchema>): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return adminFail("INVALID");
  }
  const { date, time, serviceId } = parsed.data;
  const customerName = parsed.data.customerName.trim();
  if (customerName.length === 0 || customerName.length > 80) {
    return adminFail("INVALID_NAME");
  }
  const customerPhone = normalizePhone(parsed.data.customerPhone);
  if (!customerPhone) {
    return adminFail("INVALID_PHONE");
  }

  try {
    const barbershop = await getPanelBarbershop();
    if (!barbershop) {
      return adminFail("NO_BARBERSHOP");
    }
    const service = await db.service.findFirst({ where: { id: serviceId, barbershopId: barbershop.id }, select: { id: true } });
    if (!service) {
      return adminFail("INVALID");
    }
    const instant = slotInstant(date, time);

    await db.$transaction(async (tx) => {
      await lockSlot(tx, barbershop.id, instant);
      const status = await getSlotStatus(date, time, { barbershopId: barbershop.id, now: getNow(), client: tx });
      if (status === "OUTSIDE_SCHEDULE") {
        throw new AdminActionError("OUTSIDE_SCHEDULE");
      }
      if (status === "TAKEN") {
        throw new AdminActionError("SLOT_TAKEN");
      }
      if (status === "BLOCKED") {
        throw new AdminActionError("SLOT_BLOCKED");
      }
      await tx.booking.create({
        data: {
          barbershopId: barbershop.id,
          serviceId: service.id,
          date: instant,
          userId: null,
          customerName,
          customerPhone,
          source: "MANUAL",
        },
      });
    });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return adminFail(error.code);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return adminFail("SLOT_TAKEN");
    }
    console.error("Erro ao criar reserva manual:", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/");
  revalidatePath("/adm");
  return adminOk(`Reservado para ${customerName}: ${serviceDayLabel(date)} às ${time}.`);
};
