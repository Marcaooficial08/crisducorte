"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ShareIcon, SmartphoneIcon, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  BOOKED_KEY,
  BOOKING_SUCCESS_EVENT,
  INSTALL_HINT_DISMISSED_KEY,
  countVisit,
  installPlatform,
  isStandalone,
  shouldOfferInstall,
} from "@/app/_lib/pwa/install-hint";

// Evento do Chrome/Android antes do prompt nativo de instalação (fora do lib.dom do TypeScript).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Hint = { kind: "android"; event: BeforeInstallPromptEvent } | { kind: "ios" };

// localStorage/sessionStorage podem lançar só de serem lidos (site bloqueado, aba anônima).
const storage = (kind: "localStorage" | "sessionStorage"): Storage | null => {
  try {
    return window[kind];
  } catch {
    return null;
  }
};

const readFlag = (key: string) => {
  try {
    return storage("localStorage")?.getItem(key) === "1";
  } catch {
    return false;
  }
};

const writeFlag = (key: string) => {
  try {
    storage("localStorage")?.setItem(key, "1");
  } catch {
    // Sem armazenamento: vale só nesta visita.
  }
};

// Dica "Adicionar à tela inicial" (Prompt 20, MEL-023, flag PWA_INSTALL). Cartão de 1 linha fixo no
// rodapé da tela. Android/computador: "Instalar" abre o prompt nativo. iPhone/iPad: "Instalar" mostra
// "Compartilhar → Adicionar à Tela de Início". Só depois de uma reserva com sucesso ou a partir da
// 2ª visita; some se já estiver instalado ou se a pessoa fechar. Nada é renderizado no servidor.
// Enquanto visível, o body ganha padding-bottom com a altura do cartão (nada fica escondido atrás dele).
const InstallHint = () => {
  const [hint, setHint] = useState<Hint | null>(null);
  const [eligible, setEligible] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const stepsId = useId();

  useEffect(() => {
    const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
    if (
      isStandalone(window.matchMedia("(display-mode: standalone)").matches, navigatorStandalone) ||
      readFlag(INSTALL_HINT_DISMISSED_KEY)
    ) {
      return;
    }

    const visits = countVisit(storage("localStorage"), storage("sessionStorage"));
    setEligible(shouldOfferInstall(visits, readFlag(BOOKED_KEY)));
    const onBooked = () => {
      writeFlag(BOOKED_KEY);
      setEligible(true);
    };
    window.addEventListener(BOOKING_SUCCESS_EVENT, onBooked);

    if (installPlatform(navigator.userAgent, navigator.maxTouchPoints) === "ios") {
      setHint({ kind: "ios" });
      return () => window.removeEventListener(BOOKING_SUCCESS_EVENT, onBooked);
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setHint({ kind: "android", event: event as BeforeInstallPromptEvent });
    };
    const onInstalled = () => {
      writeFlag(INSTALL_HINT_DISMISSED_KEY);
      setHint(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener(BOOKING_SUCCESS_EVENT, onBooked);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const visible = !!hint && eligible;

  // Espaço no fim da página igual à altura do cartão (acompanha a linha extra do iPhone).
  // Só cresce o fim do body: nada acima se desloca.
  useEffect(() => {
    const card = cardRef.current;
    if (!visible || !card) {
      return;
    }
    const apply = () => {
      document.body.style.paddingBottom = `${card.offsetHeight}px`;
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(card);
    return () => {
      observer.disconnect();
      document.body.style.paddingBottom = "";
    };
  }, [visible]);

  if (!visible || !hint) {
    return null;
  }

  const dismiss = () => {
    writeFlag(INSTALL_HINT_DISMISSED_KEY);
    setHint(null);
  };

  const install = async () => {
    if (hint.kind === "ios") {
      setShowSteps((value) => !value);
      return;
    }
    await hint.event.prompt();
    const { outcome } = await hint.event.userChoice;
    // O evento só vale uma vez. Recusou no prompt nativo = dispensou a dica.
    if (outcome === "dismissed") {
      writeFlag(INSTALL_HINT_DISMISSED_KEY);
    }
    setHint(null);
  };

  return (
    // Fixo no rodapé da tela (fora do fluxo): aparecer não empurra nada (CLS zero).
    <div ref={cardRef} className="fixed inset-x-0 bottom-0 z-40 px-page pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <section
        aria-labelledby="instalar-app"
        className="mx-auto w-full max-w-lg rounded-[var(--radius-lg)] border bg-background/95 py-1 pl-3 pr-1 shadow-lg backdrop-blur"
      >
        <div className="flex items-center gap-2">
          <SmartphoneIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <h2 id="instalar-app" className="min-w-0 flex-1 truncate text-body font-bold">
            Instale o app do Cris
          </h2>
          <Button
            className="min-h-11 shrink-0 px-4"
            onClick={install}
            {...(hint.kind === "ios" ? { "aria-expanded": showSteps, "aria-controls": stepsId } : {})}
          >
            Instalar
          </Button>
          <Button variant="ghost" className="h-11 w-11 shrink-0 p-0" aria-label="Agora não" onClick={dismiss}>
            <XIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        {hint.kind === "ios" && (
          <p id={stepsId} hidden={!showSteps} className="pb-2 pr-2 text-body text-muted-foreground">
            No Safari, toque em <ShareIcon className="inline h-4 w-4 align-text-bottom" aria-hidden="true" />{" "}
            <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
          </p>
        )}
      </section>
    </div>
  );
};

export default InstallHint;
