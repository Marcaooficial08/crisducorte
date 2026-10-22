-- =====================================================================
-- Prompt 20 · Web Push (MEL-023) — SQL para o SQL Editor do Supabase (produção)
-- Migração: prisma/migrations/20261022000000_web_push/migration.sql (mesmo conteúdo do bloco 2).
--
-- Como usar: cole e rode UMA consulta por vez (cada uma termina em ";"), na ordem, e anote o resultado.
--   0) Backup (pg_dump pela porta 5432, .env.producao-backup) ANTES, fora do Git.
--   1) ANTES (só leitura): consultas 1.1 a 1.4.
--   2) MIGRAÇÃO: o bloco 2 inteiro de uma vez (BEGIN … COMMIT; ou aplica tudo, ou nada).
--   3) CONFERÊNCIA (só leitura): consultas 3.1 a 3.6, comparando com o passo 1.
--   4) Na máquina local, pela porta 5432 (nunca a 6543):
--        npx prisma migrate resolve --applied 20261022000000_web_push
--        npx prisma migrate status
--   5) Só depois: PR, merge, variáveis de Production (WEB_PUSH, VAPID_*) e redeploy. O código novo lê
--      PushSubscription (Cron, cancelamento pelo Cris, Perfil); sem a migração aplicada, o deploy novo quebra.
--
-- Só aditiva: 1 tabela nova (com FK para "User" em ON DELETE CASCADE). Nada removido ou alterado,
-- nenhum dado existente modificado. Não há UPDATE neste arquivo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) ANTES (só leitura) — uma por vez
-- ---------------------------------------------------------------------

-- 1.1 Usuários e admins (sem e-mails), para comparar na 3.1.
SELECT count(*) AS usuarios,
       count(*) FILTER (WHERE "isAdmin") AS admins
FROM "User";

-- 1.2 Hash dos usuários (para comparar na 3.2).
SELECT md5(string_agg(id || '|' || coalesce(email, '-') || '|' || "isAdmin"::text || '|' || "emailReminders"::text, ',' ORDER BY id)) AS hash_usuarios
FROM "User";

-- 1.3 Reservas e registros de notificação (para comparar na 3.3).
SELECT (SELECT count(*) FROM "Booking") AS reservas_total,
       (SELECT count(*) FROM "NotificationLog") AS notification_log;

-- 1.4 A tabela nova ainda não existe. Esperado: 0 linhas.
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'PushSubscription';


-- ---------------------------------------------------------------------
-- 2) MIGRAÇÃO — o bloco inteiro de uma vez
-- ---------------------------------------------------------------------
BEGIN;
SET LOCAL lock_timeout = '5s'; -- a FK precisa de uma trava rápida em "User": se estiver ocupada, falha em vez de travar o site

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSuccessAt" TIMESTAMP(3),

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;


-- ---------------------------------------------------------------------
-- 3) CONFERÊNCIA (só leitura) — uma por vez
-- ---------------------------------------------------------------------

-- 3.1 Mesmos números da 1.1.
SELECT count(*) AS usuarios,
       count(*) FILTER (WHERE "isAdmin") AS admins
FROM "User";

-- 3.2 Mesmo hash da 1.2 (usuários intactos).
SELECT md5(string_agg(id || '|' || coalesce(email, '-') || '|' || "isAdmin"::text || '|' || "emailReminders"::text, ',' ORDER BY id)) AS hash_usuarios
FROM "User";

-- 3.3 Mesmos números da 1.3.
SELECT (SELECT count(*) FROM "Booking") AS reservas_total,
       (SELECT count(*) FROM "NotificationLog") AS notification_log;

-- 3.4 Colunas da tabela nova. Esperado: 7 linhas (id, userId, endpoint, p256dh, auth NOT NULL text;
--     createdAt NOT NULL com DEFAULT; lastSuccessAt opcional).
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'PushSubscription'
ORDER BY ordinal_position;

-- 3.5 Índices e FK. Esperado: PushSubscription_endpoint_key, PushSubscription_pkey, PushSubscription_userId_idx;
--     e 1 FK PushSubscription_userId_fkey com delete_rule = CASCADE.
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'PushSubscription' ORDER BY indexname;

SELECT tc.constraint_name, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' AND tc.table_name = 'PushSubscription' AND tc.constraint_type = 'FOREIGN KEY';

-- 3.6 Tabela nova vazia. Esperado: 0.
SELECT count(*) AS push_subscriptions FROM "PushSubscription";
