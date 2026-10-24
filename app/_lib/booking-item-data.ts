import { Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { TIME_ZONE } from "./schedule";

// Cartões de reserva (BookingItem, BookingItemAdm) são client components: tudo o que a consulta traz
// vai para o navegador. Só os campos que a tela mostra (Prompt 22), nunca o User inteiro.
export const bookingItemSelect = {
  id: true,
  date: true,
  customerName: true,
  service: { select: { name: true, price: true } },
  barbershop: { select: { name: true, address: true, imageUrl: true } },
  user: { select: { name: true } },
} satisfies Prisma.BookingSelect;

// O admin vê também o e-mail e a foto da conta do cliente.
export const adminBookingItemSelect = {
  ...bookingItemSelect,
  user: { select: { name: true, email: true, image: true } },
} satisfies Prisma.BookingSelect;

export type BookingItemData = Prisma.BookingGetPayload<{ select: typeof bookingItemSelect }>;
export type AdminBookingItemData = Prisma.BookingGetPayload<{ select: typeof adminBookingItemSelect }>;

// Data e hora da reserva sempre no fuso de São Paulo: o servidor da Vercel roda em UTC e o
// navegador pode estar em outro fuso (antes, o HTML saía com +3h e trocava na hidratação).
export const formatBookingDate = (date: Date, pattern: string): string =>
  formatInTimeZone(date, TIME_ZONE, pattern, { locale: ptBR });
