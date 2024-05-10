import Header from "../_components/header";
import { redirect } from "next/navigation";
import { db } from "../_lib/prisma";
import BookingItem from "../_components/booking-item";
import { isFuture, isPast, addHours } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "../_lib/auth";
import BookingItemAdm from "../_components/booking-item-adm";

const BookingsPage = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return redirect("/");
    }

    const userId = (session.user as any).id;

    // Obtendo horários confirmados
    const confirmedBookings = await db.booking.findMany({
        where: {
            userId,
            date: {
                gte: new Date(),
            }
        },
        include: {
            service: true,
            barbershop: true,
            user: true,
        },
    });

    // Filtrando os horários confirmados que estão há mais de uma hora no passado
    const now = new Date();
    const oneHourAgo = addHours(now, -1);
    const finishedBookings = confirmedBookings.filter(booking => new Date(booking.date) < oneHourAgo);

    // Ordenando os horários
    confirmedBookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    finishedBookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
                                <BookingItem key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </>
                )}
                {finishedBookings.length > 0 && (
                    <>
                        <h2 className="text-gray-400 uppercase font-bold text-sm mt-6 mb-3">Finalizados</h2>
                        <div className="flex flex-col gap-3">
                            {finishedBookings.map((booking) => (
                                <BookingItem key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default BookingsPage;


