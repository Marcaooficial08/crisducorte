"use client";

import { ReactNode, createContext, useContext, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { FlagMode } from "@/app/_lib/flags";
import { MOTION_ATTRIBUTE, isMotionOn } from "@/app/_lib/motion";

const MotionContext = createContext(false);

// Microinterações ligadas para quem está vendo (flag MOTION). Só para decisões de JS
// (ex.: ícone do sucesso); o visual vem das classes `fx:`, ligadas pelo atributo no <html>.
export const useMotion = () => useContext(MotionContext);

interface MotionProviderProps {
  mode: FlagMode;
  children: ReactNode;
}

// "all": o atributo já vem do servidor no <html> (layout.tsx). "admin": decide pela sessão do
// SessionProvider, que já é buscada de qualquer jeito; o layout não lê a sessão (não deixa as páginas dinâmicas).
const MotionProvider = ({ mode, children }: MotionProviderProps) => {
  const { data } = useSession();
  const on = isMotionOn(mode, data?.user?.isAdmin);

  useEffect(() => {
    if (on) {
      document.documentElement.setAttribute(MOTION_ATTRIBUTE, "on");
    } else {
      document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
    }
  }, [on]);

  return <MotionContext.Provider value={on}>{children}</MotionContext.Provider>;
};

export default MotionProvider;
