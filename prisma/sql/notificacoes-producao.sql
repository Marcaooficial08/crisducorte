-- =====================================================================
-- Prompt 19 · Notificações (MEL-022) — SQL para colar no SQL Editor do Supabase (produção)
-- Gerado de prisma/migrations/20261021000000_notificacoes/migration.sql (mesmo conteúdo).
--
-- Ordem:
--   0) Backup (pg_dump, porta 5432) ANTES, fora do Git.
--   1) Rodar o bloco "ANTES" e anotar os números.
--   2) Rodar o bloco "MIGRAÇÃO" inteiro de uma vez (transação: ou aplica tudo, ou nada).
--   3) Rodar o bloco "CONFERÊNCIA" (só leitura) e comparar com o passo 1.
--   4) Opcional, separado: bloco "TELEFONE DO CRIS" (WhatsAppButton e rodapé dos e-mails).
--   5) Na máquina local, com o .env.producao-backup (porta 5432, nunca a 6543), registrar no Prisma:
--        npx prisma migrate resolve --applied 20261021000000_notificacoes
--      e conferir com: npx prisma migrate status
--   6) Só depois: publicar o código (merge) e criar as variáveis na Vercel. O código novo lê
--      User.emailReminders, Barbershop.phone e NotificationLog; sem a migração, o deploy quebra.
--
-- Só aditiva: 1 enum novo, 1 tabela nova, 2 colunas novas (uma com DEFAULT, outra opcional).
-- Nenhuma coluna removida ou alterada; os blocos 1–3 não fazem UPDATE/DELETE.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ANTES (só leitura)
-- ---------------------------------------------------------------------
BEGIN READ ONLY;
SELECT count(*) AS usuarios, count(*) FILTER (WHERE "isAdmin") AS admins,
       count(*) FILTER (WHERE "isAdmin" AND email IS NOT NULL) AS admins_com_email
FROM "User";
SELECT md5(string_agg(id || '|' || coalesce(email, '-') || '|' || "isAdmin"::text, ',' ORDER BY id)) AS hash_usuarios
FROM "User";
SELECT id, name, address FROM "Barbershop" ORDER BY name;
SELECT count(*) AS reservas_total FROM "Booking";
-- Esperado: 0 linhas (nada disso existe ainda).
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'User' AND column_name = 'emailReminders') OR (table_name = 'Barbershop' AND column_name = 'phone')
       OR table_name = 'NotificationLog');
COMMIT;


-- ---------------------------------------------------------------------
-- 2) MIGRAÇÃO
-- ---------------------------------------------------------------------
BEGIN;
SET LOCAL lock_timeout = '5s'; -- se a tabela estiver ocupada, falha em vez de travar o site

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Barbershop" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailReminders" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_key_key" ON "NotificationLog"("key");

-- CreateIndex
CREATE INDEX "NotificationLog_status_updatedAt_idx" ON "NotificationLog"("status", "updatedAt");


COMMIT;


-- ---------------------------------------------------------------------
-- 3) CONFERÊNCIA (só leitura)
-- ---------------------------------------------------------------------
BEGIN READ ONLY;

-- Mesmos números e mesmo hash do passo 1 (usuários intactos).
SELECT count(*) AS usuarios, count(*) FILTER (WHERE "isAdmin") AS admins,
       count(*) FILTER (WHERE "isAdmin" AND email IS NOT NULL) AS admins_com_email
FROM "User";
SELECT md5(string_agg(id || '|' || coalesce(email, '-') || '|' || "isAdmin"::text, ',' ORDER BY id)) AS hash_usuarios
FROM "User";
SELECT count(*) AS reservas_total FROM "Booking";

-- Todos os usuários com lembretes ligados (DEFAULT true); nenhuma barbearia com telefone ainda.
SELECT "emailReminders", count(*) FROM "User" GROUP BY "emailReminders";
SELECT count(*) AS barbearias, count(phone) AS com_telefone FROM "Barbershop";

-- Colunas novas.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'User' AND column_name = 'emailReminders') OR (table_name = 'Barbershop' AND column_name = 'phone'))
ORDER BY table_name;

-- Tabela nova vazia, índices e enum.
SELECT count(*) AS notification_log FROM "NotificationLog";
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'NotificationLog' ORDER BY indexname;
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valores
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'NotificationStatus'
GROUP BY t.typname;

-- Tabela antiga intocada (deve existir, mesma contagem de antes).
SELECT count(*) AS backup_duplicates FROM "Booking_backup_duplicates";

COMMIT;


-- ---------------------------------------------------------------------
-- 4) TELEFONE DO CRIS (opcional, separado; o único UPDATE deste arquivo)
-- ---------------------------------------------------------------------
-- WhatsApp só com dígitos: DDD + número, sem +55, sem espaço (ex.: 31912345678).
-- Sem telefone, o botão "Enviar confirmação no WhatsApp" fica oculto e o rodapé dos e-mails sai sem o link.
-- Troque <ID_DA_BARBEARIA> pelo id do "Cris Du Corte" listado no passo 1 e <DDD_E_NUMERO> pelo número.
-- Esperado: UPDATE 1.
--
-- BEGIN;
-- UPDATE "Barbershop" SET phone = '<DDD_E_NUMERO>' WHERE id = '<ID_DA_BARBEARIA>' AND phone IS NULL;
-- SELECT name, phone FROM "Barbershop" ORDER BY name;
-- COMMIT;
