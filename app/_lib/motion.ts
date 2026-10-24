import type { FlagMode } from "./flags";

// Microinterações (flag MOTION, Prompt 21). Funções puras, usadas no navegador pelo MotionProvider.

// Atributo no <html> que liga as classes `fx:` (variante do tailwind.config.ts) e as regras do globals.css.
export const MOTION_ATTRIBUTE = "data-motion";

// Igual a isEnabled, mas com o modo vindo do servidor e o isAdmin da sessão do navegador.
export const isMotionOn = (mode: FlagMode, isAdmin: boolean | undefined): boolean =>
  mode === "all" || (mode === "admin" && isAdmin === true);

// Para o useChangedSinceMount: mudou em relação ao valor da montagem (ou já tinha mudado antes)?
export const hasChangedSinceMount = (initial: unknown, current: unknown, changedBefore: boolean): boolean =>
  changedBefore || !Object.is(initial, current);
