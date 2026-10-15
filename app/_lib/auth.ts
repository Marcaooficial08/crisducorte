import { db } from "@/app/_lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { Adapter, AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { AuthOptions } from "next-auth";

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
        isAdmin: (user as AdapterUser & { isAdmin?: boolean }).isAdmin === true,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
