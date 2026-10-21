-- =====================================================================
-- Prompt 19 · Notificações (MEL-022) — SQL para o SQL Editor do Supabase (produção)
-- Migração: prisma/migrations/20261021000000_notificacoes/migration.sql (mesmo conteúdo do bloco 2).
--
-- Como usar: cole e rode UMA consulta por vez (cada uma termina em ";"), na ordem, e anote o resultado.
--   0) Backup (pg_dump pela porta 5432, .env.producao-backup) ANTES, fora do Git.
--   1) ANTES (só leitura): consultas 1.1 a 1.6.
--   2) MIGRAÇÃO: o bloco 2 inteiro de uma vez (BEGIN … COMMIT; ou aplica tudo, ou nada).
--   3) CONFERÊNCIA (só leitura): consultas 3.1 a 3.9, comparando com o passo 1.
--   4) TELEFONE DO CRIS: o bloco 4 (o único UPDATE deste arquivo).
--   5) Na máquina local, pela porta 5432 (nunca a 6543):
--        npx prisma migrate resolve --applied 20261021000000_notificacoes
--        npx prisma migrate status
--   6) Só depois: PR, merge, variáveis de Production e redeploy. O código novo lê User.emailReminders,
--      Barbershop.phone e NotificationLog; sem a migração aplicada, o deploy novo quebra.
--
-- Só aditiva: 1 enum, 1 tabela, 2 colunas (uma com DEFAULT, outra opcional). Nada removido ou alterado.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ANTES (só leitura) — uma por vez
-- ---------------------------------------------------------------------

-- 1.1 Usuários e admins (sem e-mails). TODOS os admins com e-mail recebem os avisos ao Cris e entram no
--     Reply-To dos e-mails aos clientes (o cliente vê esses endereços). Esperado: 1 admin (o Cris).
--     Se vier mais de 1, PARE e me avise antes do merge.
SELECT count(*) AS usuarios,
       count(*) FILTER (WHERE "isAdmin") AS admins,
       count(*) FILTER (WHERE "isAdmin" AND email IS NOT NULL) AS admins_com_email
FROM "User";

-- 1.2 Hash dos usuários (para comparar na 3.2).
SELECT md5(string_agg(id || '|' || coalesce(email, '-') || '|' || "isAdmin"::text, ',' ORDER BY id)) AS hash_usuarios
FROM "User";

-- 1.3 Barbearias (anote o id do "Cris Du Corte" para o bloco 4).
SELECT id, name FROM "Barbershop" ORDER BY name;

-- 1.4 Reservas (para comparar na 3.3).
SELECT count(*) AS reservas_total FROM "Booking";

-- 1.5 Nada da migração existe ainda. Esperado: 0 linhas.
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'User' AND column_name = 'emailReminders')
       OR (table_name = 'Barbershop' AND column_name = 'phone')
       OR table_name = 'NotificationLog');

-- 1.6 Enum ainda não existe. Esperado: 0 linhas.
SELECT typname FROM pg_type WHERE typname = 'NotificationStatus';


-- ---------------------------------------------------------------------
-- 2) MIGRAÇÃO — o bloco inteiro de uma vez
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
-- 3) CONFERÊNCIA (só leitura) — uma por vez
-- ---------------------------------------------------------------------

-- 3.1 Mesmos números da 1.1.
SELECT count(*) AS usuarios,
       count(*) FILTER (WHERE "isAdmin") AS admins,
       count(*) FILTER (WHERE "isAdmin" AND email IS NOT NULL) AS admins_com_email
FROM "User";

-- 3.2 Mesmo hash da 1.2 (usuários intactos).
SELECT md5(string_agg(id || '|' || coalesce(email, '-') || '|' || "isAdmin"::text, ',' ORDER BY id)) AS hash_usuarios
FROM "User";

-- 3.3 Mesmo número da 1.4.
SELECT count(*) AS reservas_total FROM "Booking";

-- 3.4 Todos com lembretes ligados (DEFAULT true). Esperado: 1 linha, true, count = usuarios da 1.1.
SELECT "emailReminders", count(*) FROM "User" GROUP BY "emailReminders";

-- 3.5 Nenhuma barbearia com telefone ainda. Esperado: com_telefone = 0.
SELECT count(*) AS barbearias, count(phone) AS com_telefone FROM "Barbershop";

-- 3.6 Colunas novas. Esperado: 2 linhas (phone text YES null; emailReminders boolean NO true).
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'User' AND column_name = 'emailReminders')
       OR (table_name = 'Barbershop' AND column_name = 'phone'))
ORDER BY table_name;

-- 3.7 Tabela nova vazia. Esperado: 0.
SELECT count(*) AS notification_log FROM "NotificationLog";

-- 3.8 Índices. Esperado: NotificationLog_key_key, NotificationLog_pkey, NotificationLog_status_updatedAt_idx.
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'NotificationLog' ORDER BY indexname;

-- 3.9 Enum. Esperado: SENDING, SENT, FAILED, SKIPPED.
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS valores
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.typname = 'NotificationStatus'
GROUP BY t.typname;


-- ---------------------------------------------------------------------
-- 4) TELEFONE DO CRIS (o único UPDATE deste arquivo)
-- ---------------------------------------------------------------------
-- WhatsApp só com dígitos: DDD + número, sem +55 e sem espaço (ex.: 31912345678).
-- Sem telefone, o botão "Enviar confirmação no WhatsApp" fica oculto e o rodapé dos e-mails sai sem ele.
-- Troque <ID_DA_BARBEARIA> pelo id da 1.3 e <DDD_E_NUMERO> pelo número. Esperado: UPDATE 1.
BEGIN;
UPDATE "Barbershop" SET phone = '<DDD_E_NUMERO>' WHERE id = '<ID_DA_BARBEARIA>' AND phone IS NULL;
COMMIT;

-- 4.1 Conferência. Esperado: só o "Cris Du Corte" com telefone.
SELECT name, phone FROM "Barbershop" ORDER BY name;
