import { cn } from "@/app/_lib/utils";

// Bloco de carregamento (MEL-012): surface-2 com pulso de 1,5s; parado com "reduzir movimento".
const Skeleton = ({ className }: { className?: string }) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-lg bg-surface2 animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite] motion-reduce:animate-none",
        className,
      )}
    />
  );
};

export default Skeleton;
