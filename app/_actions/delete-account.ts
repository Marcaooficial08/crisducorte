"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { ADMIN_DELETE_MESSAGE, assertUser } from "../_lib/auth-guards";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "../_lib/rate-limit";

// LGPD: o cliente exclui a própria conta.
// Reservas futuras são canceladas (apagadas, como no cancelBooking); as passadas
// ficam para o histórico do Cris, sem nenhum dado pessoal (userId = null).
export const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
  const user = assertUser(await getServerSession(authOptions));

  // Retorna em vez de lançar: em produção o Next esconde a mensagem dos erros.
  if (user.isAdmin) {
    return { success: false, error: ADMIN_DELETE_MESSAGE };
  }

  if (!checkRateLimit(`delete-account:${user.id}`)) {
    return { success: false, error: RATE_LIMIT_MESSAGE };
  }

  const now = new Date();

  await db.$transaction([
    db.booking.deleteMany({ where: { userId: user.id, date: { gte: now } } }),
    db.booking.updateMany({ where: { userId: user.id }, data: { userId: null } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.account.deleteMany({ where: { userId: user.id } }),
    db.user.delete({ where: { id: user.id } }),
  ]);

  // A sessão já não existe no banco: limpa o cookie aqui em vez de chamar signOut
  // (ele tentaria apagar a sessão de novo e registraria erro). Nomes padrão do NextAuth.
  const cookieStore = cookies();
  cookieStore.delete("next-auth.session-token");
  cookieStore.delete("__Secure-next-auth.session-token");

  revalidatePath("/");
  revalidatePath("/bookings");
  revalidatePath("/adm");

  return { success: true };
};
