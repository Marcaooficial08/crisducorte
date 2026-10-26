import { cn } from "@/app/_lib/utils";

interface TimeSlotProps {
  time: string;
  booked: boolean;
  selected: boolean;
  onSelect: () => void;
}

// Horário da grade (MEL-008, 010). Ocupado: riscado, tracejado e desabilitado.
const TimeSlot = ({ time, booked, selected, onSelect }: TimeSlotProps) => {
  return (
    <button
      type="button"
      disabled={booked}
      aria-pressed={booked ? undefined : selected}
      aria-label={booked ? `${time}, ocupado` : undefined}
      onClick={onSelect}
      className={cn(
        "h-11 rounded-[var(--radius-sm)] border text-body font-bold transition-colors",
        "duration-200 ease-motion",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        booked
          ? "cursor-not-allowed border-dashed border-border bg-transparent text-disabled line-through"
          : selected
            ? // "pop" curto ao ser escolhido (a classe entra na troca de estado, então anima uma vez).
              "border-primary bg-primary text-primary-foreground motion-safe:animate-pop"
            : "glass hover:bg-secondary",
      )}
    >
      {time}
    </button>
  );
};

export default TimeSlot;
