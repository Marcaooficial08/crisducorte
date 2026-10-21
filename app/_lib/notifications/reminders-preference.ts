import { db } from "@/app/_lib/prisma";
import { verifyUnsubscribeToken } from "./unsubscribe-token";

// Opt-out do lembrete da véspera pelo link do e-mail (sem login). Só desliga, nunca liga:
// religar é no Perfil, logado. Conta excluída: nada a fazer, mas responde ok.
export const disableRemindersByToken = async (userId: string, token: string): Promise<boolean> => {
  if (!verifyUnsubscribeToken(userId, token)) {
    return false;
  }
  await db.user.updateMany({ where: { id: userId }, data: { emailReminders: false } });
  return true;
};
