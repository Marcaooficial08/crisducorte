"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2Icon } from "lucide-react";
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
import { deleteAccount } from "@/app/_actions/delete-account";

const DeleteAccountButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirmClick = async () => {
    setIsLoading(true);
    try {
      const result = await deleteAccount();
      if (!result.success) {
        toast.error(result.error ?? "Erro ao excluir a conta.");
        setIsLoading(false);
        return;
      }
      // Recarrega a página inteira para o useSession esquecer a conta.
      window.location.assign("/");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir a conta.");
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full min-h-11" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2Icon className="mr-2" size={18} />}
          Excluir minha conta
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[90%]">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
          <AlertDialogDescription>
            Suas reservas futuras serão canceladas e seus dados (nome, e-mail e foto) serão apagados. Essa ação não
            pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3">
          <AlertDialogCancel className="w-full mt-0 min-h-11">Voltar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            className="w-full min-h-11 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirmClick}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountButton;
