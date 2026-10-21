import { waitUntil } from "@vercel/functions";

// Envio depois da resposta (Prompt 19): a reserva/cancelamento já foi gravada e respondida; o e-mail
// sai em segundo plano. Na Vercel, waitUntil mantém a função viva até terminar (o Next 14 não tem
// `after`); fora dela a promessa só roda. Nunca lança: falha no e-mail não volta para quem reservou.
export const runInBackground = (task: () => Promise<unknown>): void => {
  const promise = (async () => {
    try {
      await task();
    } catch (error) {
      console.error("Erro ao enviar notificação:", error);
    }
  })();
  try {
    waitUntil(promise);
  } catch (error) {
    console.error("waitUntil indisponível:", error);
  }
};
