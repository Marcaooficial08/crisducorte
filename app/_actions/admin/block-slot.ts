"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { getSlotStatus, slotInstant } from "@/app/_lib/availability";
import { lockSlot } from "@/app/_lib/slot-lock";
import { getNow } from "@/app/_lib/schedule";
import {
  AdminActionError,
  AdminActionResult,
  adminFail,
  adminOk,
  dateSchema,
  getPanelBarbershop,
  isAdminSession,
  reasonSchema,
  timeSchema,
} from "@/app/_lib/admin-actions";

const inputSchema = z.object({ date: dateSchema, time: timeSchema, reason: reasonSchema });

// Bloqueia 1 horário livre da semana aberta (MEL-019). Horário com reserva não é bloqueado.
export const blockSlot = async (input: z.input<typeof inputSchema>): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return adminFail("INVALID");
  }
  const { date, time, reason } = parsed.data;

  try {
    const barbershop = await getPanelBarbershop();
    if (!barbershop) {
      return adminFail("NO_BARBERSHOP");
    }
    const instant = slotInstant(date, time);

    await db.$transaction(async (tx) => {
      await lockSlot(tx, barbershop.id, instant);
      const status = await getSlotStatus(date, time, { barbershopId: barbershop.id, now: getNow(), client: tx });
      if (status === "OUTSIDE_SCHEDULE") {
        throw new AdminActionError("OUTSIDE_SCHEDULE");
      }
      if (status === "TAKEN") {
        throw new AdminActionError("HAS_BOOKING");
      }
      if (status === "AVAILABLE") {
        await tx.slotBlock.create({ data: { date: instant, reason } });
      }
      // BLOCKED: já estava bloqueado, nada a fazer.
    });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return adminFail(error.code);
    }
    // Bloqueio gravado ao mesmo tempo por outra aba: o horário já está bloqueado.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      console.error("Erro ao bloquear horário:", error);
      return adminFail("GENERIC");
    }
  }

  revalidatePath("/");
  revalidatePath("/adm");
  return adminOk(`Horário ${time} bloqueado.`);
};
