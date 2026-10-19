"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import type { AdminActionResult } from "@/app/_lib/admin-actions";
import { showAdminResult } from "./admin-result";

interface BlockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string; // "Bloquear Sex 23 às 10:30" / "Bloquear Sex 23 inteiro"
  description?: string;
  onConfirm: (reason: string) => Promise<AdminActionResult>;
}

// Bloquear um horário ou o dia inteiro, com motivo opcional.
const BlockSheet = ({ open, onOpenChange, title, description, onConfirm }: BlockSheetProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (showAdminResult(await onConfirm(reason))) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Não deu certo agora. Tente de novo em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-auto p-0" aria-describedby={undefined}>
        <SheetHeader className="border-b border-solid border-secondary px-page py-6 text-left">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-col gap-6 px-page py-6">
          {description && <p className="text-body text-muted-foreground">{description}</p>}
          <div className="flex flex-col gap-2">
            <Label htmlFor="motivo-bloqueio">Motivo (opcional)</Label>
            <Input
              id="motivo-bloqueio"
              value={reason}
              maxLength={80}
              placeholder="Ex.: folga, feriado, médico"
              onChange={(event) => setReason(event.target.value)}
              className="h-11"
            />
          </div>
          <SheetFooter>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              Bloquear
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default BlockSheet;
