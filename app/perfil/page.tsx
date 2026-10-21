import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Header from "../_components/header";
import { Avatar, AvatarFallback, AvatarImage } from "../_components/ui/avatar";
import { Card, CardContent } from "../_components/ui/card";
import { authOptions } from "../_lib/auth";
import { ADMIN_DELETE_MESSAGE, assertUser, type SessionUser } from "../_lib/auth-guards";
import { db } from "../_lib/prisma";
import { isNotificacoesEnabled } from "../_lib/flags";
import DeleteAccountButton from "./_components/delete-account-button";
import EmailRemindersSwitch from "./_components/email-reminders-switch";

const ProfilePage = async () => {
  let user: SessionUser;
  const session = await getServerSession(authOptions);
  try {
    user = assertUser(session);
  } catch {
    return redirect("/");
  }

  // Switch de lembretes só com a flag NOTIFICACOES (Prompt 19).
  const showReminders = isNotificacoesEnabled(session);
  const preferences = showReminders
    ? await db.user.findUnique({ where: { id: user.id }, select: { emailReminders: true } })
    : null;

  return (
    <>
      <Header />

      <div className="px-page py-6 flex flex-col gap-6">
        <h1 className="text-title font-bold">Perfil</h1>

        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.image ?? ""} alt="" />
              <AvatarFallback>{user.name?.charAt(0).toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-bold">{user.name}</p>
              <p className="text-body text-muted-foreground truncate">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        {preferences && (
          <section className="flex flex-col gap-3">
            <h2 className="text-label uppercase text-muted-foreground font-bold">Notificações</h2>
            <EmailRemindersSwitch initialEnabled={preferences.emailReminders} />
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-label uppercase text-muted-foreground font-bold">Privacidade</h2>
          <p className="text-body text-muted-foreground">
            Veja como usamos seus dados na{" "}
            <Link href="/privacidade" className="underline text-foreground">
              Política de Privacidade
            </Link>
            .
          </p>

          {user.isAdmin ? (
            <p className="text-body text-muted-foreground">{ADMIN_DELETE_MESSAGE}.</p>
          ) : (
            <DeleteAccountButton />
          )}
        </section>
      </div>
    </>
  );
};

export default ProfilePage;
