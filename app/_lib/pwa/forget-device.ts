import { deletePushSubscription } from "@/app/_actions/push-subscription";

// "Sair": apaga a inscrição deste aparelho no servidor e no navegador, para quem usar o aparelho depois
// não receber os avisos de outra pessoa. Nunca segura o logout por mais de 3s nem lança.
export const forgetThisDevice = async (): Promise<void> => {
  const work = (async () => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) {
      return;
    }
    await deletePushSubscription(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  })().catch(() => undefined);
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, 3000))]);
};
