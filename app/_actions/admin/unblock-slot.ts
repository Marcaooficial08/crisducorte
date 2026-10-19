"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { slotInstant } from "@/app/_lib/availability";
import { AdminActionResult, adminFail, adminOk, dateSchema, isAdminSession, timeSchema } from "@/app/_lib/admin-actions";

const inputSchema = z.object({ date: dateSchema, time: timeSchema });

// Remove o bloqueio de 1 horário (MEL-019). Sem bloqueio, não faz nada.
export const unblockSlot = async (input: z.input<typeof inputSchema>): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return adminFail("INVALID");
  }
  const { date, time } = parsed.data;

  try {
    await db.slotBlock.deleteMany({ where: { date: slotInstant(date, time) } });
  } catch (error) {
    console.error("Erro ao desbloquear horário:", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/");
  revalidatePath("/adm");
  return adminOk(`Horário ${time} desbloqueado.`);
};
