import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/app/_lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  // Botão ou link de ação (ex.: "Agendar agora").
  action?: ReactNode;
  className?: string;
}

// Lista vazia (MEL-012): ícone + título + texto + ação.
const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-page py-8 text-center", className)}>
      <Icon className="h-8 w-8 text-accent" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-body font-bold">{title}</p>
        {description && <p className="text-body text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
};

export default EmptyState;
