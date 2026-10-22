# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Sempre responda em português do Brasil.**

## Commands

```bash
npm run dev          # Next.js dev server → http://localhost:3000
npm run build        # production build
npm run lint         # next lint (extends next/core-web-vitals)
npm run prepare      # prisma generate (auto-runs on install)

npx prisma migrate dev   # apply/create migrations against DATABASE_URL
npx prisma db seed       # seed via prisma/seed.ts (ts-node)
npx prisma studio        # DB GUI
```

Testes (`vitest.config.mts`, `playwright.config.ts`):
- `npm run test:unit` — Vitest com mocks (`app/**/*.test.ts`, `tests/setup/**/*.test.ts`)
- `npm run test:int` — Vitest com Postgres real (`tests/integration/**/*.int.test.ts`)
- `npm test` — unit + integração (integração pulada sem `TEST_DATABASE_URL`)
- `npm run test:e2e` — Playwright contra `next start` (rodar `npm run build` antes); login simulado pelo cookie `next-auth.session-token` com sessões criadas em `tests/setup/fixtures.ts`
- Integração e e2e **apagam dados**: só leem `TEST_DATABASE_URL` (trava em `tests/setup/test-database-url.ts` recusa Supabase/produção e o mesmo host do `DATABASE_URL`). Local: branch `testes` do Neon. CI: Postgres temporário em `.github/workflows/testes.yml`.

## Stack

Next.js 14 App Router · TypeScript (strict) · Tailwind · shadcn/ui (Radix primitives, config `components.json`) · Prisma + PostgreSQL · NextAuth v4 (Google provider + Prisma adapter).

Path alias `@/*` → repo root (e.g. `@/app/_lib/prisma`).

## Architecture

All routes live under `app/`. Underscore folders are non-route by convention:

- `app/_lib/` — shared singletons: `prisma.ts` exports `db`, `auth.ts` exports `authOptions`, `auth-guards.ts` exports `assertUser`/`assertAdmin`, `utils.ts` exports `cn`
- `app/_components/ui/` — shadcn primitives
- `app/_components/` — shared layout components (Header, Footer, SideMenu, BookingItem, etc.)
- `app/_actions/` — Server Actions (e.g. `cancel-booking.ts`)
- `app/_providers/` — client context providers (mounted in `app/layout.tsx`)
- Route segments: `(home)`, `barbershop/[id]`, `bookings`, `adm`, `api/auth/[...nextauth]`
- `pages/_document.tsx` — legacy shim, do not add routes here

**Data model:** `User ↔ Booking ↔ Service ↔ Barbershop`. NextAuth tables coexist (`Account`, `Session`, `VerificationToken`, `VerificationRequest`). Admin gating via `User.isAdmin` (see below).

## Business Rules (não tratar como bug sem confirmação)

- Agendamentos apenas sexta e sábado
- Horários fixos: 9:00, 10:30, 11:30 … 19:30 (gerados em `barbershop/[id]/_helpers/hours.ts`)
- Agenda abre na segunda-feira só para a sexta e o sábado daquela semana (regra completa em `app/_lib/schedule.ts` e `docs/redesign-spec.md` §1)

## Admin (load-bearing)

Admin = `User.isAdmin` (lido do banco no session callback de `app/_lib/auth.ts`, exposto como `session.user.isAdmin`).

- Guards em `app/_lib/auth-guards.ts`: `assertUser(session)` e `assertAdmin(session)`. Actions/páginas de admin usam `assertAdmin`; actions de cliente, `assertUser`.
- Marcar admin: `npm run set-admin -- email@x.com` (mostra o host do banco e pede confirmação).
- Não adicionar checks por id ou e-mail no código.

## Environment

`.env` necessário:
- `DATABASE_URL` — PostgreSQL. Local: Neon dev. **Production (Supabase), em runtime na Vercel: Transaction pooler, porta 6543, com `?pgbouncer=true&connection_limit=1`** — nunca o Session pooler (5432) em runtime (incidente EMAXCONNSESSION de 2026-10-19, ver `docs/progresso.md`). O código é compatível: interactive transactions, `pg_advisory_xact_lock` (trava de transação, não de sessão) e sem prepared statements (`pgbouncer=true`); `PrismaClient` único em `globalThis` (`app/_lib/prisma.ts`) e interactive transactions com `INTERACTIVE_TX_OPTIONS` (`app/_lib/transaction.ts`, P2028 → mensagem "muita gente reservando")
- Backup (`pg_dump`) e `npx prisma migrate resolve/status` em produção usam a **porta 5432** (Session pooler, precisam de sessão inteira), lida de `.env.producao-backup` (fora do git, só o dono roda). Nunca usar a 6543 para migrate ou backup
- `TEST_DATABASE_URL` — banco só de testes (opcional; necessário para `test:int` e `test:e2e`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET` — único nome lido pelo NextAuth (`app/_lib/auth.ts`); modelo em `.env.example`
- `AGENDA_V2` — feature flag `off | admin | all` (padrão `off`), lida por `isEnabled` em `app/_lib/flags.ts`
- `NEW_HOME` — home nova (`off | admin | all`, padrão `off`); ligada, a home antiga fica em `/classic`
- `ADMIN_PANEL_V2` — painel do admin com grade, bloqueios e reserva manual (`off | admin | all`, padrão `off`); desligada, o `/adm` mostra a lista antiga + métricas
- `MENSALISTAS` — aba Mensalistas do `/adm` (`off | admin | all`, padrão `off`); com `all`, o mensalista com conta (mesmo e-mail) vê a reserva em "Meu próximo agendamento"
- `NOTIFICACOES` — e-mails (confirmação, lembrete da véspera, avisos ao cliente e ao Cris) e botão do WhatsApp na reserva (`off | admin | all`, padrão `off`). Fora da tela não há sessão: `isNotificacoesEnabledForUser` decide pelo cliente da reserva (`admin` = só reservas de quem é admin). Código em `app/_lib/notifications/`; envio sempre depois do commit (`runInBackground`), nunca bloqueia reserva/cancelamento; idempotência por `NotificationLog.key` única
- `CALENDARIO` — "Adicionar ao calendário" (link do Google Agenda + `.ics` de `/api/calendario`) no cartão de sucesso da reserva e em "Meu próximo agendamento" (`off | admin | all`, padrão `off`). Funções puras em `app/_lib/calendar.ts`; evento de 60 min fixos, horário em UTC a partir do fuso de SP
- `PWA_INSTALL` — service worker e dica "Adicionar à tela inicial" (`off | admin | all`, padrão `off`). Manifest (`app/manifest.ts`, ícones em `public/icons`) e `theme-color` ficam fora de flag. SW escrito à mão em `app/_lib/pwa/service-worker.ts`, servido por `app/sw.js/route.ts`: cache só de `/_next/static`, `/icons` e `/brand`; páginas, RSC, Server Actions, `/api` e login nunca passam pelo cache. Versão = commit do deploy (atualiza sozinho); com `off`, o `/sw.js` se remove dos aparelhos
- `SMTP_USER` / `SMTP_PASS` — conta Gmail dedicada + senha de app (nodemailer). Testes zeram as duas (`vitest.config.mts`, `playwright.config.ts`): nada sai dos testes
- `CRON_SECRET` — protege `/api/cron/notificacoes` (Cron da Vercel em `vercel.json`: qui e sex 23:00 UTC = 20h em SP; Hobby = 1x/dia, minuto impreciso; só roda em Production). `?dia=yyyy-MM-dd` só fora de produção
- `NOTIFY_ALLOWLIST` — só na staging: e-mails que podem receber; o resto vira `SKIPPED`
- `SCHEDULE_NOW` — relógio fixo da agenda, só no e2e (`getNow` em `app/_lib/schedule.ts` exige `E2E=1` e ignora na Vercel)

## Workflow

Antes de alterar código:
1. Liste arquivos que serão criados/alterados e motivo
2. Aguarde confirmação antes de implementar

Ao implementar:
- Server Components por padrão; `"use client"` apenas quando necessário
- Server Actions em `app/_actions/`; proteger por sessão quando necessário
- TypeScript estrito, evitar `any`
- UI consistente com shadcn/Tailwind
- Corrigir apenas o necessário, sem refatorar o projeto inteiro

## Regras do redesign

- Atendimento só na sexta e no sábado **da semana atual**, abrindo na segunda; sábado só mostra o sábado; domingo não mostra dia nenhum (`getNextServiceDays`)
- Grade fixa de 11 horários, igual nos dois dias: 09:00, 10:30, 11:30, 12:30, 13:30, 14:30, 15:30, 16:30, 17:30, 18:30, 19:30
- Todo serviço ocupa exatamente 1 horário
- Admin definido por `User.isAdmin` — nunca por e-mail ou id escrito no código
- Cores: `--primary` `#7354F5` para botões com texto branco; `--accent` `#8162FF` para destaques
- Contraste mínimo 4,5:1; alvo de toque mínimo 44px
- Toda mudança visível ao cliente fica atrás de feature flag
- Migrações do Prisma só aditivas (nada de drop/rename destrutivo)
- **Nunca** fazer commit, push ou deploy sem autorização explícita do usuário
- A `main` é protegida (PR + check `testes` obrigatórios): nada de commit direto na `main`. O registro em `docs/progresso.md` vai **dentro do próprio PR**, com o status "publicado em produção — previsto após o merge"; não se faz commit de docs depois do merge
