import { BrowserContext, Page, Response } from "@playwright/test";

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

const isServerAction = (res: Response) => res.request().method() === "POST" && !!res.request().headers()["next-action"];

// Abre a página logado e espera o /api/auth/session do usuário. O SessionProvider só pede a sessão
// depois de hidratar, então a partir daqui os cliques já têm os handlers do React.
export const gotoLoggedIn = async (page: Page, url: string, userId: string) => {
  const sessionLoaded = page.waitForResponse(
    async (res) => res.url().endsWith("/api/auth/session") && (await res.json())?.user?.id === userId,
  );
  await page.goto(url);
  await sessionLoaded;
};

// Espera as próximas `count` server actions responderem (a ida ao banco não entra no timeout das asserções).
export const waitForServerActions = (page: Page, count = 1) =>
  new Promise<void>((resolve) => {
    let seen = 0;
    const onResponse = (res: Response) => {
      if (isServerAction(res) && ++seen === count) {
        page.off("response", onResponse);
        resolve();
      }
    };
    page.on("response", onResponse);
  });

// Horário (HH:mm, São Paulo) de um dia como Date UTC — o mesmo que a agenda grava.
export const atSaoPauloTime = (day: Date, time: string): Date => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(day);
  date.setUTCHours(hours + 3, minutes, 0, 0); // São Paulo = UTC-3, sem horário de verão
  return date;
};
