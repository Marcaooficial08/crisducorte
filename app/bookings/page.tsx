import Header from "../_components/header";
import { redirect } from "next/navigation";
import { db } from "../_lib/prisma";
import BookingItem from "../_components/booking-item";
import { getServerSession } from "next-auth";
import { authOptions } from "../_lib/auth";
import { bookingItemSelect } from "../_lib/booking-item-data";
import { bookingOwnersWhere } from "../_lib/next-booking";
import EmptyState from "../_components/empty-state";
import { Button } from "../_components/ui/button";
import { CalendarIcon } from "lucide-react";
import Link from "next/link";

// Server Actions desta página enviam e-mail/push em segundo plano (waitUntil): até 60s (Prompt 22).
export const maxDuration = 60;

const BookingsPage = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return redirect("/");
    }

    // Reservas da conta e as de mensalista com o e-mail da conta (Prompt 22, 5a).
    const owners = bookingOwnersWhere(session.user);

    const [confirmedBookings, finishedBookings] = await Promise.all([
        db.booking.findMany({
            where: {
                OR: owners,
                date: {
                    gte: new Date(),
                }
            },
            select: bookingItemSelect,
        }),
        db.booking.findMany({
            where: {
                OR: owners,
                date: {
                    lt: new Date(),
                }
            },
            select: bookingItemSelect,
        }),
    ]);

    // Ordena as reservas por data
    confirmedBookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    finishedBookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <>
            <Header />
            <div className="px-page py-6">
                <h1 className="text-title font-bold mb-6">Agendamentos</h1>
                {confirmedBookings.length > 0 && (
                    <>
                        <h2 className="text-muted-foreground uppercase font-bold text-label mb-3">Confirmados</h2>
                        <div className="flex flex-col gap-3">
                            {confirmedBookings.map((booking) => (
                                <BookingItem key={booking.id} booking={booking} readOnly={booking.source === "MENSALISTA"} />
                            ))}
                        </div>
                    </>
                )}
                {finishedBookings.length > 0 && (
                    <>
                        <h2 className="text-muted-foreground uppercase font-bold text-label mt-6 mb-3">Finalizados</h2>
                        <div className="flex flex-col gap-3">
                            {finishedBookings.map((booking) => (
                                <BookingItem key={booking.id} booking={booking} readOnly={booking.source === "MENSALISTA"} />
                            ))}
                        </div>
                    </>
                )}
                {confirmedBookings.length === 0 && finishedBookings.length === 0 && (
                    <EmptyState
                        icon={CalendarIcon}
                        title="Você ainda não tem horários marcados."
                        action={
                            <Button asChild>
                                <Link href="/">Agendar agora</Link>
                            </Button>
                        }
                    />
                )}
            </div>
        </>
    );
};

export default BookingsPage;







