import { db } from "@/app/_lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import NextAuth, { AuthOptions } from "next-auth";
import { Booking } from "@prisma/client";

// Função para redirecionar as reservas marcadas pelo usuário especial para outro usuário
const redirectSpecialBookings = async (): Promise<void> => {
  try {
    const specialUserId = "clu79mptd0000tvy12eh8254l";
    const redirectedUserId = "clu79vlr300001l7m8izc642g";

    // Redirecionar as reservas marcadas pelo usuário especial para o novo ID
    await db.booking.updateMany({
      where: {
        userId: specialUserId,
      },
      data: {
        userId: redirectedUserId,
      },
    });
  } catch (error) {
    console.error("Erro ao redirecionar reservas do usuário especial:", error);
  }
};
// Função para recuperar as reservas do usuário
export const getUserBookings = async (userId: string): Promise<Booking[]> => {
  try {
    // Redirecionar as reservas marcadas pelo usuário especial, se necessário
    await redirectSpecialBookings();

    // Recuperar todas as reservas de todos os usuários
    const allBookings = await db.booking.findMany();

    // Se o usuário for especial, retorna todas as reservas normais e as reservas redirecionadas para ele
    if (userId === "clu79mptd0000tvy12eh8254l") {
      return allBookings.filter((booking) => booking.userId === userId || booking.userId === "clu79vlr300001l7m8izc642g" );
    }

    // Para usuários normais, retorna apenas as suas próprias reservas
    return allBookings.filter((booking) => booking.userId === userId);
  } catch (error) {
    console.error("Erro ao recuperar reservas:", error);
    return [];
  }
};




// Definindo a interface para o objeto de usuário na sessão
interface SessionUser {
  id: string;
  name: string;
  email: string;
  hasFullAccess?: boolean; // Propriedade opcional para indicar acesso total
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Adiciona uma flag ao objeto de sessão para indicar que o usuário tem acesso total
      // às reservas de outros usuários se o ID do usuário for clu79mptd0000tvy12eh8254l
      if (user.id === "clu79mptd0000tvy12eh8254l") {
        session.user = { ...session.user, hasFullAccess: true, } as SessionUser;
      }else {
        // Usuário normal
        session.user = {
          ...session.user,
          id: user.id,
          hasFullAccess: false,
        } as SessionUser;
      }

      return Promise.resolve(session);
    },
  },
  secret: process.env.NEXT_AUTH_SECRET,
};





























































  

  


  





























































  

  


  




























































  

  


  





























































  

  


  