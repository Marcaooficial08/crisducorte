-- Prevent double-booking: only one booking allowed per barbershop slot
CREATE UNIQUE INDEX "Booking_barbershopId_date_key" ON "Booking"("barbershopId", "date");
