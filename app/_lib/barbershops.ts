import { Prisma } from "@prisma/client";

// Barbearias fora das listagens. Não são apagadas (têm reservas antigas);
// o link direto /barbershop/[id] continua funcionando.
export const HIDDEN_BARBERSHOP_NAMES = ["Indisponivel"];

export const visibleBarbershopWhere: Prisma.BarbershopWhereInput = {
  NOT: HIDDEN_BARBERSHOP_NAMES.map((name) => ({
    name: { equals: name, mode: "insensitive" },
  })),
};
