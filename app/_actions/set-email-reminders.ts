"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { assertUser } from "../_lib/auth-guards";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "../_lib/rate-limit";
import { disableRemindersByToken } from "../_lib/notifications/reminders-preference";

// Switch "Lembretes por e-mail" do Perfil (Prompt 19): liga/desliga só o lembrete da véspera.
// Confirmação e "o Cris cancelou sua reserva" sempre saem (transacionais).
export const setEmailReminders = async (enabled: boolean): Promise<{ success: boolean; error?: string }> => {
  const user = assertUser(await getServerSession(authOptions));
  if (typeof enabled !== "boolean") {
    return { success: false, error: "Dados inválidos." };
  }
  if (!checkRateLimit(`email-reminders:${user.id}`)) {
    return { success: false, error: RATE_LIMIT_MESSAGE };
  }

  await db.user.update({ where: { id: user.id }, data: { emailReminders: enabled } });
  revalidatePath("/perfil");
  return { success: true };
};

const tokenSchema = z.object({ userId: z.string().min(1).max(100), token: z.string().min(1).max(100) });

// Botão da página /notificacoes/lembretes (link do e-mail, sem login).
export const unsubscribeReminders = async (input: { userId: string; token: string }): Promise<{ success: boolean }> => {
  const parsed = tokenSchema.safeParse(input);
  if (!parsed.success || !checkRateLimit(`unsubscribe:${parsed.data.userId}`)) {
    return { success: false };
  }
  return { success: await disableRemindersByToken(parsed.data.userId, parsed.data.token) };
};
