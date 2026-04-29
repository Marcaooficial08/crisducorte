import Header from "../_components/header";
import { redirect } from "next/navigation";
import { db } from "../_lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../_lib/auth";
import BookingItemAdm from "../_components/booking-item-adm";

const BookingsPageAdm = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return redirect("/");
    }

    if (!session.user.hasFullAccess) {
        return redirect("/");
    }

    const now = new Date();

    // Admin vê todas as reservas — sem filtro de userId
    const confirmedBookings = await db.booking.findMany({
        where: {
            date: { gte: now },
        },
        include: {
            service: true,
            barbershop: true,
            user: true,
        },
        orderBy: { date: "asc" },
    });

    const finishedBookings = await db.booking.findMany({
        where: {
            date: { lt: now },
        },
        include: {
            service: true,
            barbershop: true,
            user: true,
        },
        orderBy: { date: "desc" },
    });

    return (
        <>
            <Header />
            <div className="px-5 py-6">
                <h1 className="text-xl font-bold mb-6">Agendamentos</h1>
                {confirmedBookings.length > 0 && (
                    <>
                        <h2 className="text-gray-400 uppercase font-bold text-sm mb-3">Confirmados</h2>
                        <div className="flex flex-col gap-3">
                            {confirmedBookings.map((booking) => (
                                <BookingItemAdm key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </>
                )}
                {finishedBookings.length > 0 && (
                    <>
                        <h2 className="text-gray-400 uppercase font-bold text-sm mt-6 mb-3">Finalizados</h2>
                        <div className="flex flex-col gap-3">
                            {finishedBookings.map((booking) => (
                                <BookingItemAdm key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </>
                )}
                {confirmedBookings.length === 0 && finishedBookings.length === 0 && (
                    <p className="text-gray-400 text-sm">Nenhum agendamento encontrado.</p>
                )}
            </div>
        </>
    );
};

export default BookingsPageAdm;
