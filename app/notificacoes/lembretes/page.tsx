import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/app/_components/header";
import { verifyUnsubscribeToken } from "@/app/_lib/notifications/unsubscribe-token";
import UnsubscribeButton from "./_components/unsubscribe-button";

export const metadata: Metadata = {
  title: "Lembretes por e-mail",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: { u?: string; t?: string };
}

// Link "Não quero mais lembretes" dos e-mails (Prompt 19). Abrir a página não desliga nada
// (antivírus de e-mail abre links sozinho): só o botão.
const RemindersOptOutPage = ({ searchParams }: PageProps) => {
  const userId = typeof searchParams.u === "string" ? searchParams.u : "";
  const token = typeof searchParams.t === "string" ? searchParams.t : "";
  const valid = verifyUnsubscribeToken(userId, token);

  return (
    <>
      <Header />
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-page py-6">
        <h1 className="text-title font-bold">Lembretes por e-mail</h1>
        {valid ? (
          <>
            <p className="text-body text-muted-foreground">
              Desligar o lembrete que chega na véspera do seu horário? A confirmação da reserva e o aviso de
              cancelamento continuam chegando.
            </p>
            <UnsubscribeButton userId={userId} token={token} />
          </>
        ) : (
          <p className="text-body text-muted-foreground">
            Link inválido. Você pode ligar ou desligar os lembretes no{" "}
            <Link href="/perfil" className="text-foreground underline">
              Perfil
            </Link>
            .
          </p>
        )}
      </div>
    </>
  );
};

export default RemindersOptOutPage;
