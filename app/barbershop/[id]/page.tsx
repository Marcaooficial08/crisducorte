import { db } from "@/app/_lib/prisma";
import BarbershopInfo from "./_components/barbershop-info";
import ServiceItem from "./_components/service-item";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/_lib/auth";
import { isAgendaV2Enabled } from "@/app/_lib/flags";
import { getNextServiceDays } from "@/app/_lib/schedule";

interface BarbershopDetailsPageProps {
  params: {
    id?: string;
  };
}

const BarbershopDetailsPage = async ({ params }: BarbershopDetailsPageProps) => {
  const session = await getServerSession(authOptions);

  if (!params.id) {
    return null;
  }

  const barbershop = await db.barbershop.findUnique({
    where: { id: params.id },
    include: { services: true },
  });

  if (!barbershop) {
    return null;
  }

  // Agenda nova: dias e horários calculados só no servidor.
  const serviceDays = isAgendaV2Enabled(session) ? getNextServiceDays(new Date()) : null;

  return (
    <div>
      <BarbershopInfo barbershop={barbershop} />
      <div className="px-page flex flex-col gap-4 py-6">
        {barbershop.services.map((service) => (
          <ServiceItem
            key={service.id}
            barbershop={barbershop}
            service={service}
            isAuthenticated={!!session?.user}
            serviceDays={serviceDays}
          />
        ))}
      </div>
    </div>
  );
};

export default BarbershopDetailsPage;
