import { toast } from "sonner";
import type { AdminActionResult } from "@/app/_lib/admin-actions";

// Toast da resposta de uma action do painel; true se deu certo.
// A grade atualiza sozinha: as actions chamam revalidatePath("/adm").
export const showAdminResult = (result: AdminActionResult): boolean => {
  if (result.success) {
    toast.success(result.message);
    return true;
  }
  toast.error(result.error);
  return false;
};
