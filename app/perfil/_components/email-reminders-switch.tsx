"use client";

import { useState } from "react";
import { toast } from "sonner";
import { setEmailReminders } from "@/app/_actions/set-email-reminders";
import { cn } from "@/app/_lib/utils";

interface EmailRemindersSwitchProps {
  initialEnabled: boolean;
}

// Switch "Lembretes por e-mail" (Prompt 19): só o lembrete da véspera. A linha inteira é o alvo de toque.
const EmailRemindersSwitch = ({ initialEnabled }: EmailRemindersSwitchProps) => {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const result = await setEmailReminders(next);
      if (!result.success) {
        setEnabled(!next);
        toast.error(result.error ?? "Não conseguimos salvar agora. Tente de novo.");
        return;
      }
      toast(next ? "Lembretes ligados." : "Lembretes desligados.");
    } catch (error) {
      console.error(error);
      setEnabled(!next);
      toast.error("Não conseguimos salvar agora. Tente de novo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-describedby="lembretes-descricao"
      disabled={saving}
      onClick={toggle}
      className="flex min-h-11 w-full items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-border px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70"
    >
      <span className="flex flex-col">
        <span className="font-bold">Lembretes por e-mail</span>
        <span id="lembretes-descricao" className="text-body text-muted-foreground">
          Um e-mail na véspera do seu horário. A confirmação e o aviso de cancelamento sempre chegam.
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
          enabled ? "border-primary bg-primary" : "border-border bg-secondary",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-foreground transition-transform",
            enabled ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
};

export default EmailRemindersSwitch;
