import { Prisma } from "@prisma/client";

// Barbearias fora das listagens e da reserva. Não são apagadas (têm reservas antigas).
export const HIDDEN_BARBERSHOP_NAMES = ["Indisponivel"];

export const visibleBarbershopWhere: Prisma.BarbershopWhereInput = {
  NOT: HIDDEN_BARBERSHOP_NAMES.map((name) => ({
    name: { equals: name, mode: "insensitive" },
  })),
};
