"use client";

import { useState } from "react";
import { hasChangedSinceMount } from "./motion";

// true depois que `value` muda pela primeira vez desde a montagem (e continua true, mesmo se voltar).
// Serve para animar só mudanças, nunca o primeiro carregamento (não mexe na primeira pintura nem no LCP).
export const useChangedSinceMount = (value: unknown): boolean => {
  const [initial] = useState(value);
  const [changed, setChanged] = useState(false);
  const now = hasChangedSinceMount(initial, value, changed);
  if (now && !changed) {
    setChanged(true);
  }
  return now;
};
