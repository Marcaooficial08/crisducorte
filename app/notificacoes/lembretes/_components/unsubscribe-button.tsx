"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import { unsubscribeReminders } from "@/app/_actions/set-email-reminders";

interface UnsubscribeButtonProps {
  userId: string;
  token: string;
}

const UnsubscribeButton = ({ userId, token }: UnsubscribeButtonProps) => {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleClick = async () => {
    setState("loading");
    try {
      const result = await unsubscribeReminders({ userId, token });
      setState(result.success ? "done" : "error");
    } catch (error) {
      console.error(error);
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className="text-body">
        Pronto: você não vai mais receber lembretes. Para ligar de novo, entre no app e abra o{" "}
        <Link href="/perfil" className="underline">
          Perfil
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button className="min-h-11 w-full" onClick={handleClick} disabled={state === "loading"}>
        {state === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        Desligar lembretes
      </Button>
      {state === "error" && (
        <p role="alert" className="text-body text-muted-foreground">
          Não conseguimos desligar agora. Tente de novo em instantes ou use o Perfil.
        </p>
      )}
    </div>
  );
};

export default UnsubscribeButton;
