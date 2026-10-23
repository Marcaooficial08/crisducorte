"use server";

import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "../_lib/auth";
import { db } from "../_lib/prisma";
import { assertUser } from "../_lib/auth-guards";
import { isWebPushEnabled } from "../_lib/flags";
import { RATE_LIMIT_MESSAGE, checkRateLimit } from "../_lib/rate-limit";
import { runInBackground } from "../_lib/notifications/background";
import { isAllowedEndpoint, isPushConfigured, sendPush } from "../_lib/notifications/push";
import { testPush } from "../_lib/notifications/push-templates";

// Switch "Notificações no celular" do Perfil (Prompt 20, flag WEB_PUSH). Uma inscrição por aparelho;
// a inscrição é o opt-in do lembrete da véspera e do aviso "o Cris cancelou" por push.

type Result = { success: boolean; error?: string };

const UNAVAILABLE = "Não foi possível ativar agora. Tente de novo.";

// Chaves do navegador em base64url: p256dh tem 65 bytes (87 caracteres), auth 16 bytes (22).
const base64Url = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/);

const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isAllowedEndpoint),
  keys: z.object({ p256dh: base64Url(80, 100), auth: base64Url(16, 32) }),
});

export type PushSubscriptionInput = z.infer<typeof subscriptionSchema>;

// Liga neste aparelho (ou confirma a inscrição que o navegador já tinha). sendTest: manda o push
// "Notificações ligadas" só para este aparelho, na hora de ligar.
export const savePushSubscription = async (input: PushSubscriptionInput, sendTest = false): Promise<Result> => {
  const session = await getServerSession(authOptions);
  const user = assertUser(session);
  if (!isWebPushEnabled(session) || !isPushConfigured()) {
    return { success: false, error: UNAVAILABLE };
  }
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success || typeof sendTest !== "boolean") {
    return { success: false, error: "Dados inválidos." };
  }
  if (!checkRateLimit(`push:${user.id}`)) {
    return { success: false, error: RATE_LIMIT_MESSAGE };
  }

  const { endpoint, keys } = parsed.data;
  // Mesmo aparelho com outra conta (trocou de login): a inscrição passa para a conta atual.
  const subscription = await db.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
  });

  if (sendTest) {
    runInBackground(async () => {
      const result = await sendPush(subscription, testPush());
      if (result.status === "GONE") {
        await db.pushSubscription.deleteMany({ where: { id: subscription.id } });
      } else if (result.status === "FAILED") {
        console.error("Falha ao enviar o push de teste:", result.error);
      }
    });
  }
  return { success: true };
};

// Desliga neste aparelho (switch ou "Sair"). Só apaga inscrição da própria conta.
export const deletePushSubscription = async (endpoint: string): Promise<Result> => {
  const user = assertUser(await getServerSession(authOptions));
  if (typeof endpoint !== "string" || endpoint.length > 1000) {
    return { success: false, error: "Dados inválidos." };
  }
  if (!checkRateLimit(`push:${user.id}`)) {
    return { success: false, error: RATE_LIMIT_MESSAGE };
  }
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return { success: true };
};
