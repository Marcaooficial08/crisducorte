import { BrowserContext } from "@playwright/test";

// Simula o login: o NextAuth usa sessão no banco, então basta o cookie com o token criado no setup.
export const loginAs = async (context: BrowserContext, sessionToken: string) => {
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
};

// Quarta-feira ao meio-dia (São Paulo) daqui a pelo menos uma semana:
// o calendário atual libera a sexta e o sábado da semana do "agora" do navegador.
export const futureWednesdayNoon = (): Date => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7 + ((3 - date.getUTCDay() + 7) % 7));
  date.setUTCHours(15, 0, 0, 0); // 12:00 em São Paulo
  return date;
};
