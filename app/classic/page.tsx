import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../_lib/auth";
import { isNewHomeEnabled } from "../_lib/flags";
import ClassicHome from "../(home)/_components/classic-home";

export const metadata: Metadata = {
  title: "Home clássica",
  robots: { index: false, follow: false },
};

// Home antiga enquanto a home nova é testada (spec §6, flag NEW_HOME).
// Com a flag desligada, a própria "/" já é a home antiga.
export default async function ClassicPage() {
  const session = await getServerSession(authOptions);

  if (!isNewHomeEnabled(session)) {
    redirect("/");
  }

  return <ClassicHome session={session} />;
}
