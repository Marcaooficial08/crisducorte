import { DELETED_ACCOUNT_LABEL } from "./auth-guards";

interface BookingCustomer {
  customerName?: string | null;
  user: { name: string | null } | null;
}

// Nome do cliente da reserva: customerName (reserva manual) ?? nome da conta.
// Conta sem nome → "Cliente"; sem conta (excluída, LGPD) e sem customerName → "Conta excluída".
export const getCustomerName = (booking: BookingCustomer): string => {
  if (booking.customerName) {
    return booking.customerName;
  }
  if (booking.user) {
    return booking.user.name ?? "Cliente";
  }
  return DELETED_ACCOUNT_LABEL;
};
