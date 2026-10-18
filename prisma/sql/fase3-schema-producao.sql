-- =====================================================================
-- Fase 3 · schema (MEL-019, MEL-025) — SQL para colar no SQL Editor do Supabase (produção)
-- Gerado de prisma/migrations/20261017000000_fase3_schema/migration.sql (mesmo conteúdo).
--
-- Ordem:
--   0) Backup (pg_dump) ANTES, fora do Git.
--   1) Rodar o bloco "ANTES" e anotar os números.
--   2) Rodar o bloco "MIGRAÇÃO" inteiro de uma vez (transação: ou aplica tudo, ou nada).
--   3) Rodar o bloco "CONFERÊNCIA" (só leitura) e comparar com o passo 1.
--   4) Na máquina local, com DATABASE_URL de produção, registrar no histórico do Prisma:
--        npx prisma migrate resolve --applied 20261017000000_fase3_schema
--      e conferir com: npx prisma migrate status
--
-- Só aditiva: nenhuma coluna removida ou alterada, nenhum UPDATE/DELETE.
-- Não toca no índice "Booking_barbershopId_date_key" nem na tabela "Booking_backup_duplicates".
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ANTES (só leitura)
-- ---------------------------------------------------------------------
BEGIN READ ONLY;
SELECT count(*) AS reservas_total, count("userId") AS com_usuario, min(date) AS primeira, max(date) AS ultima
FROM "Booking";
SELECT md5(string_agg(id || '|' || "barbershopId" || '|' || "serviceId" || '|' || coalesce("userId", '-') || '|' || date::text, ',' ORDER BY id)) AS hash_reservas
FROM "Booking";
COMMIT;


-- ---------------------------------------------------------------------
-- 2) MIGRAÇÃO
-- ---------------------------------------------------------------------
BEGIN;
SET LOCAL lock_timeout = '5s'; -- se a tabela estiver ocupada, falha em vez de travar o site


-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('CLIENT', 'MANUAL', 'MENSALISTA');

-- CreateEnum
CREATE TYPE "MensalistaStatus" AS ENUM ('ATIVO', 'PAUSADO', 'EXCLUIDO');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "cycleId" TEXT,
ADD COLUMN     "mensalistaId" TEXT,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "BookingCancellation" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "byAdmin" BOOLEAN NOT NULL,
    "source" "BookingSource" NOT NULL,

    CONSTRAINT "BookingCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotBlock" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensalista" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "fixedDay" INTEGER,
    "fixedTime" TEXT,
    "status" "MensalistaStatus" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mensalista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensalistaCycle" (
    "id" TEXT NOT NULL,
    "mensalistaId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "weekends" TIMESTAMP(3)[],
    "endsAt" TIMESTAMP(3) NOT NULL,
    "renewedAt" TIMESTAMP(3),

    CONSTRAINT "MensalistaCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingCancellation_date_idx" ON "BookingCancellation"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SlotBlock_date_key" ON "SlotBlock"("date");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_mensalistaId_fkey" FOREIGN KEY ("mensalistaId") REFERENCES "Mensalista"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MensalistaCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensalistaCycle" ADD CONSTRAINT "MensalistaCycle_mensalistaId_fkey" FOREIGN KEY ("mensalistaId") REFERENCES "Mensalista"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


COMMIT;


-- ---------------------------------------------------------------------
-- 3) CONFERÊNCIA (só leitura)
-- ---------------------------------------------------------------------
BEGIN READ ONLY;

-- Mesmos números e mesmo hash do passo 1 (colunas antigas intactas).
SELECT count(*) AS reservas_total, count("userId") AS com_usuario, min(date) AS primeira, max(date) AS ultima
FROM "Booking";
SELECT md5(string_agg(id || '|' || "barbershopId" || '|' || "serviceId" || '|' || coalesce("userId", '-') || '|' || date::text, ',' ORDER BY id)) AS hash_reservas
FROM "Booking";

-- Todas as reservas atuais com source = CLIENT e campos novos vazios.
SELECT source, count(*) AS reservas,
       count("customerName") AS com_customer_name, count("customerPhone") AS com_customer_phone,
       count("mensalistaId") AS com_mensalista, count("cycleId") AS com_ciclo
FROM "Booking" GROUP BY source;

-- Colunas novas de Booking.
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Booking'
ORDER BY ordinal_position;

-- Tabelas novas (esperado: 4 linhas, todas vazias).
SELECT 'BookingCancellation' AS tabela, count(*) FROM "BookingCancellation"
UNION ALL SELECT 'SlotBlock', count(*) FROM "SlotBlock"
UNION ALL SELECT 'Mensalista', count(*) FROM "Mensalista"
UNION ALL SELECT 'MensalistaCycle', count(*) FROM "MensalistaCycle";

-- Enums.
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valores
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname IN ('BookingSource', 'MensalistaStatus')
GROUP BY t.typname;

-- Índices (Booking_barbershopId_date_key continua, novos: BookingCancellation_date_idx, SlotBlock_date_key).
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('Booking', 'BookingCancellation', 'SlotBlock', 'Mensalista', 'MensalistaCycle')
ORDER BY tablename, indexname;

-- Chaves estrangeiras novas.
SELECT conname, conrelid::regclass::text AS tabela, pg_get_constraintdef(oid) AS definicao
FROM pg_constraint
WHERE conname IN ('Booking_mensalistaId_fkey', 'Booking_cycleId_fkey', 'MensalistaCycle_mensalistaId_fkey');

-- Tabela antiga intocada (deve existir, mesma contagem de antes).
SELECT count(*) AS backup_duplicates FROM "Booking_backup_duplicates";

COMMIT;
