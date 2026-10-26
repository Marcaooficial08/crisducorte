# Operação do dia a dia

Guia para o dono (e para quem mantiver o app): ligar/desligar recursos, conferir notificações, voltar uma versão, backup e migração. Tudo em produção é feito pelo dono; o Claude Code nunca roda nada contra produção.

## 1. Flags (botões de desligar)

Ficam só três. Valores: `off` (desligado), `admin` (só contas com `isAdmin`), `all` (todos). Hoje as três estão em `all` em Production.

| Flag | O que desliga | Quando usar |
|---|---|---|
| `NOTIFICACOES` | E-mails (confirmação, "Nova reserva", lembrete da véspera, avisos de cancelamento, renovação de mensalista), o aviso "Enviamos a confirmação…" e o botão do WhatsApp no cartão de sucesso | Gmail fora do ar, e-mail indo para spam, texto errado |
| `WEB_PUSH` | Switch "Notificações no celular" no Perfil e os pushes (lembrete e "o Cris cancelou") | Push com problema; trocar as chaves VAPID |
| `PWA_INSTALL` | Dica "Instale o app do Cris" | Dica atrapalhando. Com `PWA_INSTALL` **e** `WEB_PUSH` em `off`, o `/sw.js` se desinstala dos aparelhos (rollback do service worker sem deploy de código) |

**Como mudar:** Vercel → projeto → Settings → Environment Variables → editar em Production (e Preview, se for o caso) → **Redeploy** do último deploy (a variável só vale depois do redeploy).

`admin` serve para religar com cuidado: só as reservas/cancelamentos de quem é admin geram e-mail/push, e só o admin vê a dica e o switch.

Flags que já viraram código e podem ser **apagadas** da Vercel: `AGENDA_V2`, `NEW_HOME`, `ADMIN_PANEL_V2`, `MENSALISTAS`, `CALENDARIO`, `MOTION` (o código não lê mais nenhuma) e a antiga `NEXT_AUTH_SECRET` (o NextAuth só lê `NEXTAUTH_SECRET`).

## 2. Notificações e `NotificationLog`

Cada e-mail/push tem uma linha em `NotificationLog` com uma `key` única (`confirm:<reserva>`, `admin-new:<reserva>:<admin>`, `reminder:<reserva>`, `push-reminder:<reserva>`…). A mesma key nunca envia duas vezes. Sem e-mail nem texto no registro (LGPD).

| status | Significado |
|---|---|
| `SENT` | Entregue ao Gmail / ao serviço de push |
| `SKIPPED` | Não enviado de propósito (lembrete desligado pelo cliente, fora da `NOTIFY_ALLOWLIST`) |
| `FAILED` com `attempts` < 3 | Falhou **antes** de sair; o Cron tenta de novo (confirmação e "Nova reserva", se a reserva ainda for futura) |
| `FAILED` com "Sem tempo na função; fica para o Cron." | Não começou (a função ia acabar); o Cron envia, sem risco de duplicar |
| `FAILED` com `attempts` = 3 | Final: ou esgotou as tentativas, ou falhou depois de o Gmail receber a mensagem (pode ter chegado; não reenvia para não duplicar) |
| `FAILED` "Interrompido durante o envio; não reenviado." | A linha ficou em `SENDING` por mais de 10 min (a função morreu no meio); fechada sem reenviar |

Consultas (Supabase → SQL Editor, **só leitura**):

```sql
-- Últimos 7 dias por tipo e status
SELECT kind, status, count(*) FROM "NotificationLog"
WHERE "createdAt" > now() - interval '7 days'
GROUP BY kind, status ORDER BY kind, status;

-- Falhas recentes com o motivo (e-mails já vêm trocados por <e-mail>)
SELECT key, kind, attempts, "lastError", "createdAt", "updatedAt" FROM "NotificationLog"
WHERE status = 'FAILED' ORDER BY "updatedAt" DESC LIMIT 20;

-- Lembretes da última quinta/sexta (e-mail e push)
SELECT kind, status, count(*) FROM "NotificationLog"
WHERE kind IN ('REMINDER', 'PUSH_REMINDER') AND "createdAt" > now() - interval '2 days'
GROUP BY kind, status;
```

Nos logs da Vercel (Logs, filtrando pelo horário): "Notificação CONFIRMATION enviada em N ms." mostra o tempo do Gmail; "Falha ao enviar …" traz o erro.

## 3. Cron dos lembretes

- `vercel.json`: `0 23 * * 4,5` = quinta e sexta às 20h em SP (Hobby: roda em algum minuto dessa hora). Só roda em Production.
- Conferir: Vercel → Settings → Cron Jobs (última execução) e a consulta "Lembretes" acima.
- O Cron também tenta de novo as confirmações que falharam antes de sair, fecha os `SENDING` parados e avisa o Cris das renovações de mensalista.
- Na staging, chamar à mão: `curl -H "Authorization: Bearer <CRON_SECRET do Preview>" "https://crisducorte-staging.vercel.app/api/cron/notificacoes?dia=yyyy-MM-dd"` (`?dia` é recusado em produção).

## 4. Voltar uma versão (rollback)

1. **Recurso específico com problema:** desligue a flag (seção 1) e faça o redeploy.
2. **Deploy inteiro com problema:** Vercel → Deployments → deploy anterior que funcionava → "Promote to Production" (Instant Rollback). Não precisa mexer no Git na hora; depois, corrigir num PR.
3. **Service worker:** `PWA_INSTALL=off` e `WEB_PUSH=off` + redeploy → os aparelhos removem o SW e os caches na próxima visita.
4. Se o deploy anterior dependia de uma migração já aplicada, tudo bem: as migrações são só aditivas (o código antigo ignora tabela/coluna nova).

## 5. Backup

Sempre antes de qualquer SQL em produção, pela **porta 5432** (Session pooler), com a URL do `.env.producao-backup` (fora do Git, só na máquina do dono):

```bash
pg_dump "<URL da 5432>" --format=custom --no-owner --file prod-AAAA-MM-DD-motivo.dump   # ou o comando que você já usa
```

Guardar o `.dump` fora do Git, em lugar seguro (tem dados de clientes). Nunca usar a 6543 para backup.

## 6. Migração em produção

A Vercel só roda `next build`; ninguém roda `migrate deploy` em produção.

1. A migração nasce no PR (`prisma/migrations/...`), só aditiva, e vem com um arquivo `prisma/sql/<nome>-producao.sql`: consultas de ANTES (leitura), o bloco da migração entre `BEGIN`/`COMMIT` e consultas de CONFERÊNCIA (leitura).
2. Dono: backup (seção 5).
3. Dono: Supabase → SQL Editor → rodar o arquivo na ordem, uma consulta por vez, anotando os resultados.
4. Dono, na máquina local, pela 5432: `npx prisma migrate resolve --applied <pasta_da_migração>` e `npx prisma migrate status` ("Database schema is up to date!").
5. Só então merge do PR (o código novo pode depender da tabela/coluna nova).

## 7. Tabelas e registros legados (decisão D8, Prompt 22)

- `Booking_backup_duplicates` (só em produção, criada fora do Git): pelo nome, cópia das reservas duplicadas guardada quando entrou o índice único `Booking_barbershopId_date_key`. O app não lê. Deve ter dados pessoais antigos: remoção prevista no Prompt 23, com backup antes.
- Linha com falha da migração `add_booking_unique_slot` em `_prisma_migrations`: tentativa antiga, já superada; o `migrate status` dá "up to date". Fica até o Prompt 23.

Não apagar nenhuma das duas sem backup e sem o SQL revisado.

## 8. Contas e segredos

- Admin = `User.isAdmin` no banco: `npm run set-admin -- email@x.com` (mostra o host e pede confirmação). Nunca por e-mail ou id no código.
- `NEXTAUTH_SECRET`: trocar invalida os links "Não quero mais lembretes" dos e-mails antigos; só troque se vazou.
- Chaves VAPID: um par em Preview e outro em Production; trocar o par invalida as inscrições de push (as pessoas precisam religar no Perfil).
- `SMTP_PASS` é a senha de app da conta Gmail dedicada da barbearia.
