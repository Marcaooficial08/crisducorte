"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deletePushSubscription, savePushSubscription } from "@/app/_actions/push-subscription";
import { installPlatform, isStandalone } from "@/app/_lib/pwa/install-hint";
import {
  PUSH_ERROR_MESSAGE,
  PUSH_STATUS_MESSAGES,
  PushStatus,
  pushStatusOf,
  sameKey,
  urlBase64ToUint8Array,
} from "@/app/_lib/pwa/push-client";
import { cn } from "@/app/_lib/utils";

interface PushSwitchProps {
  vapidPublicKey: string;
}

const subscriptionInput = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  return { endpoint: json.endpoint ?? "", keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } };
};

const registration = async () => {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
};

export const PUSH_DELIVERY_TIP =
  "Não está recebendo? Em alguns celulares, como Xiaomi, libere as notificações e o uso de bateria do Chrome nas configurações do aparelho.";

// Switch "Notificações no celular" (Prompt 20, flag WEB_PUSH): inscrição deste aparelho no Web Push.
// No iPhone só funciona com o app instalado (iOS 16.4+). A linha inteira é o alvo de toque.
const PushSwitch = ({ vapidPublicKey }: PushSwitchProps) => {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const initial = pushStatusOf({
      ios: installPlatform(navigator.userAgent, navigator.maxTouchPoints) === "ios",
      standalone: isStandalone(window.matchMedia("(display-mode: standalone)").matches, navigatorStandalone),
      supported,
      permission: "Notification" in window ? Notification.permission : "unsupported",
    });
    if (initial) {
      setStatus(initial);
      return;
    }
    (async () => {
      const existing = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
      if (existing && sameKey(existing.options.applicationServerKey, urlBase64ToUint8Array(vapidPublicKey))) {
        setStatus("on");
        // Confirma no servidor (ex.: o aparelho trocou de conta). Sem push de teste.
        await savePushSubscription(subscriptionInput(existing)).catch(() => undefined);
        return;
      }
      setStatus("off");
    })().catch(() => setStatus("off"));
  }, [vapidPublicKey]);

  const enable = async () => {
    // Pedir a permissão primeiro, ainda dentro do toque (o Safari exige).
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus(permission === "denied" ? "denied" : "off");
      return;
    }
    const key = urlBase64ToUint8Array(vapidPublicKey);
    const worker = await registration();
    let subscription = await worker.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    subscription ??= await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const result = await savePushSubscription(subscriptionInput(subscription), true);
    if (!result.success) {
      await subscription.unsubscribe().catch(() => undefined);
      toast.error(result.error ?? PUSH_ERROR_MESSAGE);
      return;
    }
    setStatus("on");
    toast("Notificações ligadas neste aparelho.");
  };

  const disable = async () => {
    const subscription = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
    if (subscription) {
      await deletePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("off");
    toast("Notificações desligadas neste aparelho.");
  };

  const toggle = async () => {
    setSaving(true);
    try {
      await (status === "on" ? disable() : enable());
    } catch (error) {
      console.error(error);
      toast.error(PUSH_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  const message = PUSH_STATUS_MESSAGES[status];
  const enabled = status === "on";
  const blocked = status !== "on" && status !== "off";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-describedby="push-descricao"
        disabled={saving || blocked}
        onClick={toggle}
        className="flex min-h-11 w-full items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-border px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70"
      >
        <span className="flex flex-col">
          <span className="font-bold">Notificações no celular</span>
          <span id="push-descricao" className="text-body text-muted-foreground">
            {message ?? "Lembrete na véspera e aviso se o Cris cancelar."}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
            enabled ? "border-primary bg-primary" : "border-border bg-secondary",
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 rounded-full bg-foreground transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </span>
      </button>
      {/* Dica quando o push está ligado mas não chega (Prompt 22; texto aprovado pelo dono em 2026-10-23). */}
      {enabled && <p className="px-1 text-caption text-muted-foreground">{PUSH_DELIVERY_TIP}</p>}
    </div>
  );
};

export default PushSwitch;
