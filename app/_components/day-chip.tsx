import { cn } from "@/app/_lib/utils";

interface DayChipProps {
  label: string; // "Sex 16"
  freeCount: number;
  selected: boolean;
  onSelect: () => void;
}

export const freeSlotsText = (freeCount: number) =>
  freeCount === 0 ? "Lotado" : freeCount === 1 ? "1 horário livre" : `${freeCount} horários livres`;

// Dia de atendimento (MEL-008). Dia lotado continua clicável para ver a grade.
const DayChip = ({ label, freeCount, selected, onSelect }: DayChipProps) => {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-[60px] flex-1 flex-col items-center justify-center rounded-[var(--radius-lg)] border px-3 py-2",
        // O escolhido acende com cor, borda e brilho em 180ms.
        "transition-[color,background-color,border-color,box-shadow] duration-[180ms] ease-motion",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // .glass fica fora de @layer e venceria a borda e o fundo do selecionado.
        selected ? "border-accent bg-accent/[0.18] shadow-selected" : "glass hover:bg-secondary",
      )}
    >
      <span className="font-bold">{label}</span>
      <span className="text-caption text-muted-foreground">{freeSlotsText(freeCount)}</span>
    </button>
  );
};

export default DayChip;
