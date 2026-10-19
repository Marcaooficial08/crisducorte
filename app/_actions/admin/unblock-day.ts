"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "@/app/_lib/auth";
import { db } from "@/app/_lib/prisma";
import { dayRange } from "@/app/_lib/availability";
import { AdminActionResult, adminFail, adminOk, dateSchema, isAdminSession, plural } from "@/app/_lib/admin-actions";

const inputSchema = z.object({ date: dateSchema });

// "Desbloquear dia": remove todos os bloqueios do dia (São Paulo).
export const unblockDay = async (input: z.input<typeof inputSchema>): Promise<AdminActionResult> => {
  if (!isAdminSession(await getServerSession(authOptions))) {
    return adminFail("UNAUTHORIZED");
  }
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return adminFail("INVALID");
  }

  let count = 0;
  try {
    ({ count } = await db.slotBlock.deleteMany({ where: { date: dayRange(parsed.data.date) } }));
  } catch (error) {
    console.error("Erro ao desbloquear o dia:", error);
    return adminFail("GENERIC");
  }

  revalidatePath("/");
  revalidatePath("/adm");
  return adminOk(`${plural(count, "horário desbloqueado", "horários desbloqueados")}.`);
};
