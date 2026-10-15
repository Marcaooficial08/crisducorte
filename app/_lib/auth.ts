import { db } from "@/app/_lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { Adapter, AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { AuthOptions } from "next-auth";

// TODO(MEL-014): remover este fallback no próximo PR, depois que o isAdmin
// estiver marcado em produção.
const LEGACY_ADMIN_EMAIL = "crisducorteserra@gmail.com";

const resolveIsAdmin = async (user: AdapterUser & { isAdmin?: boolean }): Promise<boolean> => {
  if (user.isAdmin) return true;
  if (user.email !== LEGACY_ADMIN_EMAIL) return false;

  const adminCount = await db.user.count({ where: { isAdmin: true } });
  if (adminCount > 0) return false;

  console.warn(
    `[auth] Nenhum usuário com isAdmin = true; usando fallback do e-mail antigo para ${LEGACY_ADMIN_EMAIL}. Rode prisma/scripts/set-admin.ts.`,
  );
  return true;
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    // Sessão no banco (PrismaAdapter): `user` vem do banco a cada requisição,
    // então mudanças em isAdmin valem sem precisar sair e entrar de novo.
    async session({ session, user }) {
      session.user = {
        ...session.user,
        id: user.id,
        isAdmin: await resolveIsAdmin(user),
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
