"use client";

import { useChangedSinceMount } from "@/app/_lib/use-changed-since-mount";
import { cn } from "@/app/_lib/utils";

// Número das métricas do /adm. MOTION: dá um "pulinho" (escala 1.25) quando muda depois de uma ação
// (revalidatePath), nunca ao abrir a página. key = valor: cada mudança remonta e a animação roda de novo.
const AnimatedNumber = ({ value }: { value: number }) => {
  const changed = useChangedSinceMount(value);
  return (
    <span key={value} data-testid="animated-number" className={cn("inline-block", changed && "fx:motion-safe:animate-bump")}>
      {value}
    </span>
  );
};

export default AnimatedNumber;
