import { PrismaClient } from "@prisma/client";

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

// Um PrismaClient por processo, guardado em globalThis também em produção: se o módulo for
// carregado mais de uma vez (chunks diferentes, hot reload), não abre outro pool de conexões.
// Production usa o transaction pooler do Supabase com connection_limit=1 (ver CLAUDE.md).
const prisma = globalThis.cachedPrisma ?? new PrismaClient();
globalThis.cachedPrisma = prisma;

export const db = prisma;
