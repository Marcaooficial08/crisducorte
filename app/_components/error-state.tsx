"use client";

import { AlertTriangleIcon } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/app/_lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry: () => void;
  className?: string;
}

// Falha ao carregar (MEL-012): card com borda destructive 40% + "Tentar de novo".
const ErrorState = ({ title = "Algo deu errado", message, onRetry, className }: ErrorStateProps) => {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-card px-page py-8 text-center", className)}>
      <AlertTriangleIcon className="h-8 w-8 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-body font-bold">{title}</p>
        <p className="text-body text-muted-foreground">{message}</p>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
};

export default ErrorState;
