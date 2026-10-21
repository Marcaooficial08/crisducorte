"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import { excludeMensalista, pauseMensalista, reactivateMensalista } from "@/app/_actions/admin/mensalista-status";
import type { AdminActionResult } from "@/app/_lib/admin-actions";
import type { MensalistaItem } from "@/app/_lib/mensalistas";
import { FIXED_DAY_LABELS } from "@/app/_lib/mensalista-cycle";
import { formatPhone, whatsappUrl } from "@/app/_lib/phone";
import { cn } from "@/app/_lib/utils";
import { showAdminResult } from "./admin-result";

interface MensalistaCardProps {
  mensalista: MensalistaItem;
  onEdit: () => void;
  onPay: () => void;
}

interface ConfirmProps {
  trigger: string;
  title: string;
  description: string;
  confirm: string;
  variant: "secondary" | "destructive";
  disabled: boolean;
  onConfirm: () => void;
}

const Confirm = ({ trigger, title, description, confirm, variant, disabled, onConfirm }: ConfirmProps) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant={variant} size="sm" disabled={disabled}>
        {trigger}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="w-[90%]">
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row gap-3">
        <AlertDialogCancel className="mt-0 w-full">Voltar</AlertDialogCancel>
        <AlertDialogAction className="w-full" onClick={onConfirm}>
          {confirm}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

// MensalistaCard (spec §3, §4.5): nome, WhatsApp, horário fixo, barra "x de 4", próximo
// atendimento e ações. Com o ciclo no último fim de semana ou vencido, vira o aviso de renovação.
const MensalistaCard = ({ mensalista, onEdit, onPay }: MensalistaCardProps) => {
  const [loading, setLoading] = useState(false);
  const { name, phone, fixedDay, fixedTime, status, cycle, nextBooking, needsRenewal } = mensalista;
  const paused = status === "PAUSADO";
  const fixedLabel = fixedDay && fixedTime ? `${FIXED_DAY_LABELS[fixedDay]} · ${fixedTime}` : "Sem horário fixo";
  const showProgress = !paused && cycle && !cycle.ended;

  const run = async (action: () => Promise<AdminActionResult>) => {
    setLoading(true);
    try {
      showAdminResult(await action());
    } catch (error) {
      console.error(error);
      toast.error("Não deu certo agora. Tente de novo em instantes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li
      aria-label={name}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border p-4",
        paused ? "border-dashed border-border text-muted-foreground" : needsRenewal ? "border-warning" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={cn("text-title font-bold", !paused && "text-foreground")}>{name}</h3>
        <Badge variant="secondary">{fixedLabel}</Badge>
        {paused && <Badge variant="outline">Pausado</Badge>}
      </div>

      <a
        href={whatsappUrl(phone)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chamar ${name} no WhatsApp`}
        className="inline-flex min-h-11 w-fit items-center text-body font-bold text-accent-soft underline underline-offset-4"
      >
        {formatPhone(phone)}
      </a>

      {showProgress && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: cycle.total }, (_, index) => (
              <span
                key={index}
                className={cn("h-2 flex-1 rounded-full", index < cycle.position ? "bg-primary" : "bg-secondary")}
              />
            ))}
          </div>
          <p className="text-body">{cycle.situation}</p>
        </div>
      )}
      {!paused && !cycle && <p className="text-body text-muted-foreground">Sem ciclo pago</p>}
      {nextBooking && <p className="text-body text-muted-foreground">Próximo: {nextBooking}</p>}

      {needsRenewal && cycle && (
        <p role="status" className="text-body font-bold text-warning">
          {cycle.ended
            ? `Ciclo terminou · ${cycle.period}. Renovar mensalista?`
            : `Último fim de semana do ciclo (${cycle.period}). Renovar mensalista?`}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!paused && (!cycle || needsRenewal) && (
          <Button size="sm" disabled={loading || !fixedDay} onClick={onPay}>
            {cycle ? "Renovar" : "Registrar pagamento"}
          </Button>
        )}
        <Button variant="secondary" size="sm" disabled={loading} onClick={onEdit} aria-label={`Editar ${name}`}>
          Editar
        </Button>
        {paused ? (
          <Button variant="secondary" size="sm" disabled={loading} onClick={() => run(() => reactivateMensalista(mensalista.id))}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Reativar
          </Button>
        ) : (
          <Confirm
            trigger="Pausar"
            title={`Pausar ${name}?`}
            description="As reservas futuras dele são canceladas e os horários ficam livres. Para voltar, reative e registre um novo pagamento."
            confirm="Pausar"
            variant="secondary"
            disabled={loading}
            onConfirm={() => run(() => pauseMensalista(mensalista.id))}
          />
        )}
        <Confirm
          trigger="Excluir"
          title={`Excluir ${name}?`}
          description="Sai da lista de mensalistas e as reservas futuras são canceladas. O histórico continua guardado."
          confirm="Excluir"
          variant="destructive"
          disabled={loading}
          onConfirm={() => run(() => excludeMensalista(mensalista.id))}
        />
      </div>
    </li>
  );
};

export default MensalistaCard;
