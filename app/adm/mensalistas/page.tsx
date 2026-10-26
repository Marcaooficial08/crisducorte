import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Header from "@/app/_components/header";
import { authOptions } from "@/app/_lib/auth";
import { assertAdmin } from "@/app/_lib/auth-guards";
import { db } from "@/app/_lib/prisma";
import { visibleBarbershopWhere } from "@/app/_lib/barbershops";
import { getMensalistas } from "@/app/_lib/mensalistas";
import { getNow } from "@/app/_lib/schedule";
import AdminTabs from "../_components/admin-tabs";
import MensalistasPanel from "../_components/mensalistas-panel";

// Aba Mensalistas do painel (spec §4.5, MEL-025). Só isAdmin.
const MensalistasPage = async () => {
  const session = await getServerSession(authOptions);
  try {
    assertAdmin(session);
  } catch {
    return redirect("/");
  }

  // Relógio da agenda (getNow): no e2e, a mesma semana da grade.
  const now = getNow();
  const [mensalistas, barbershop] = await Promise.all([
    getMensalistas(now),
    db.barbershop.findFirst({
      where: visibleBarbershopWhere,
      orderBy: { id: "asc" },
      select: { services: { orderBy: { id: "asc" }, select: { id: true, name: true } } },
    }),
  ]);

  return (
    <>
      <Header />
      <div className="mx-auto w-full max-w-2xl px-page py-6">
        <AdminTabs current="mensalistas" pendingRenewals={mensalistas.filter((item) => item.needsRenewal).length} />
        <MensalistasPanel mensalistas={mensalistas} services={barbershop?.services ?? []} now={now.toISOString()} />
      </div>
    </>
  );
};

export default MensalistasPage;
