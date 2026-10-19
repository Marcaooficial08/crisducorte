import { BookingSource } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/app/_lib/prisma";
import { dayRange } from "@/app/_lib/availability";
import { getCustomerName } from "@/app/_lib/customer-name";
import { TIME_GRID, TIME_ZONE, getNextServiceDays, serviceDayLabel } from "@/app/_lib/schedule";

// Grade do painel do admin (spec §4.4): a semana aberta (mesmos dias de getNextServiceDays),
// os 11 horários de cada dia e o dono de cada um.

export interface AdminSlotBooking {
  id: string;
  customerName: string;
  customerPhone: string | null;
  serviceName: string;
  source: BookingSource;
}

export interface AdminSlot {
  time: string;
  // Horário que já passou: aparece, mas sem ações.
  past: boolean;
  booking: AdminSlotBooking | null;
  block: { reason: string | null } | null;
}

export interface AdminDay {
  date: string; // "yyyy-MM-dd" (São Paulo)
  label: string; // "Sex 23"
  freeCount: number; // livres e ainda por vir
  blockedCount: number;
  slots: AdminSlot[];
}

export const isFreeSlot = (slot: AdminSlot) => !slot.past && !slot.booking && !slot.block;

const timeOf = (instant: Date) => formatInTimeZone(instant, TIME_ZONE, "HH:mm");

export const getAdminAgenda = async (barbershopId: string, now: Date): Promise<AdminDay[]> => {
  const serviceDays = getNextServiceDays(now);

  return Promise.all(
    serviceDays.map(async (day) => {
      const range = dayRange(day.date);
      const [bookings, blocks] = await Promise.all([
        db.booking.findMany({
          where: { barbershopId, date: range },
          include: { service: { select: { name: true } }, user: { select: { name: true } } },
        }),
        db.slotBlock.findMany({ where: { date: range }, select: { date: true, reason: true } }),
      ]);

      const bookingByTime = new Map(bookings.map((booking) => [timeOf(booking.date), booking]));
      const blockByTime = new Map(blocks.map((block) => [timeOf(block.date), block]));

      const slots: AdminSlot[] = TIME_GRID.map((time) => {
        const booking = bookingByTime.get(time);
        const block = blockByTime.get(time);
        return {
          time,
          past: !day.times.includes(time),
          booking: booking
            ? {
                id: booking.id,
                customerName: getCustomerName(booking),
                customerPhone: booking.customerPhone,
                serviceName: booking.service.name,
                source: booking.source,
              }
            : null,
          block: block ? { reason: block.reason } : null,
        };
      });

      return {
        date: day.date,
        label: serviceDayLabel(day.date),
        freeCount: slots.filter(isFreeSlot).length,
        blockedCount: slots.filter((slot) => slot.block).length,
        slots,
      };
    }),
  );
};
