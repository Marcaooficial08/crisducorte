// Telefone (WhatsApp) da reserva manual: gravado só com os dígitos, DDD + número, sem o 55.

// "(11) 91234-5678", "+55 11 91234-5678" → "11912345678"; null se não tiver 10 ou 11 dígitos.
export const normalizePhone = (input: string): string | null => {
  let digits = input.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits.length === 10 || digits.length === 11 ? digits : null;
};

// "11912345678" → "(11) 91234-5678"; outro formato volta como está.
export const formatPhone = (digits: string): string => {
  const match = digits.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
};

export const whatsappUrl = (digits: string): string => `https://wa.me/55${digits.replace(/\D/g, "")}`;
