"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { FlagMode } from "@/app/_lib/flags";

interface SwRegisterProps {
  modes: FlagMode[]; // PWA_INSTALL e WEB_PUSH, lidas no servidor: qualquer uma ligada para o usuário registra
}

// Registra o service worker (Prompt 20) depois do carregamento, quando o navegador está ocioso:
// nada no caminho crítico da página. Só no build de produção (no `next dev` o SW atrapalharia o HMR).
// Flag desligada para este usuário: remove o SW que ele tiver (o /sw.js com "off" também se remove sozinho).
const SwRegister = ({ modes }: SwRegisterProps) => {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const enabled = modes.some((mode) => mode === "all" || (mode === "admin" && isAdmin));

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator) || status === "loading") {
      return;
    }

    const run = () => {
      if (enabled) {
        navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => {
          console.error("Falha ao registrar o service worker:", error);
        });
        return;
      }
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      // Safari não tem requestIdleCallback.
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(run, { timeout: 5000 });
      } else {
        timeoutId = setTimeout(run, 1000);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }
    return () => {
      window.removeEventListener("load", schedule);
      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [enabled, status]);

  return null;
};

export default SwRegister;
