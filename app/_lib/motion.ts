// Microinterações (Prompt 21). Função pura do useChangedSinceMount.

// Para o useChangedSinceMount: mudou em relação ao valor da montagem (ou já tinha mudado antes)?
export const hasChangedSinceMount = (initial: unknown, current: unknown, changedBefore: boolean): boolean =>
  changedBefore || !Object.is(initial, current);
