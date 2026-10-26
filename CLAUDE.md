# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Sempre responda em português do Brasil.**

## Commands

```bash
npm run dev          # Next.js dev server → http://localhost:3000
npm run build        # production build
npm run lint         # next lint (extends next/core-web-vitals)
npx tsc --noEmit     # tipos do app, tests/ e e2e/ (também no CI)
npm run prepare      # prisma generate (auto-runs on install)

npx prisma migrate dev   # apply/create migrations against DATABASE_URL
npx prisma studio        # DB GUI
npm run set-admin -- email@x.com   # marca isAdmin (mostra o host do banco e pede confirmação)
```

Testes (`vitest.config.mts`, `playwright.config.ts`) — rodar **um de cada vez**:
- `npm run test:unit` — Vitest com mocks (`app/**/*.test.ts`, `tests/setup/**/*.test.ts`); `npm run test:coverage` = unit + cobertura
- `npm run test:int` — Vitest com Postgres real (`tests/integration/**/*.int.test.ts`)
- `npm run test:e2e` — Playwright contra `next start` (rodar `npm run build` antes); login simulado pelo cookie `next-auth.session-token` com sessões de `tests/setup/fixtures.ts`; relógio do servidor fixo numa quarta futura (`SCHEDULE_NOW`)
- Integração e e2e **apagam dados**: só leem `TEST_DATABASE_URL` (trava em `tests/setup/test-database-url.ts` recusa Supabase/produção e o mesmo host do `DATABASE_URL`). Local: branch `testes` do Neon. CI: Postgres temporário em `.github/workflows/testes.yml`.

## Stack

Next.js 14 App Router · TypeScript (strict) · Tailwind · shadcn/ui (Radix, `components.json`) · Prisma + PostgreSQL · NextAuth v4 (Google + Prisma adapter, sessão no banco). Path alias `@/*` → raiz.

## Architecture

Rotas em `app/`; pastas com `_` não são rotas:

- `app/_lib/` — `prisma.ts` (`db`, um `PrismaClient` em `globalThis`), `auth.ts` (`authOptions`), `auth-guards.ts` (`assertUser`/`assertAdmin`), `flags.ts`, `schedule.ts` (regra da agenda, `getNow`), `availability.ts` (ponto único de disponibilidade), `transaction.ts`, `slot-lock.ts`, `notifications/`, `pwa/`
- `app/_actions/` — Server Actions do cliente (`save-booking.ts`, `cancel-booking.ts`…); `app/_actions/admin/` — do painel
- `app/_components/` (com `ui/` do shadcn), `app/_providers/`
- Rotas: `(home)` (reserva), `bookings`, `perfil`, `privacidade`, `adm` (+ `adm/mensalistas`), `notificacoes/lembretes`, `api/auth`, `api/calendario` (.ics), `api/cron/notificacoes`, `api/notificacoes/lembretes`, `sw.js`. `/barbershop/[id]` e `/classic` redirecionam (308) para `/` (`next.config.mjs`)

**Data model:** `User ↔ Booking ↔ Service ↔ Barbershop`, mais `SlotBlock`, `BookingCancellation`, `Mensalista`/`MensalistaCycle`, `NotificationLog`, `PushSubscription` e as tabelas do NextAuth.

## Business Rules (não tratar como bug sem confirmação)

- Atendimento só sexta e sábado **da semana atual**, abrindo na segunda; sábado só mostra o sábado; domingo nenhum dia (`getNextServiceDays`, `app/_lib/schedule.ts`; spec §1)
- Grade fixa de 11 horários: 09:00, 10:30, 11:30, 12:30, 13:30, 14:30, 15:30, 16:30, 17:30, 18:30, 19:30. Todo serviço ocupa 1 horário
- Reserva, bloqueio e pagamento de mensalista usam `pg_advisory_xact_lock` por horário (`slot-lock.ts`) dentro de interactive transactions com `INTERACTIVE_TX_OPTIONS` (P2028 → "muita gente reservando")

## Admin (load-bearing)

Admin = `User.isAdmin` (lido do banco no session callback, `session.user.isAdmin`). Actions/páginas do admin usam `assertAdmin` no servidor; do cliente, `assertUser`. **Nunca** checar admin por id ou e-mail no código.

## Environment

Modelo comentado em `.env.example`. Pontos que quebram produção se errados:
- `DATABASE_URL` de produção (Supabase, runtime na Vercel): **Transaction pooler, porta 6543, `?pgbouncer=true&connection_limit=1`** — nunca o Session pooler (5432) em runtime (incidente EMAXCONNSESSION, 2026-10-19). Backup (`pg_dump`) e `prisma migrate resolve/status` usam a **5432** pelo `.env.producao-backup` (fora do Git, só o dono)
- `NEXTAUTH_SECRET` (único nome lido); `TEST_DATABASE_URL` só para testes
- Flags (`off | admin | all`, padrão `off`), só três botões de desligar: `NOTIFICACOES`, `WEB_PUSH`, `PWA_INSTALL`. Uso e rollback em `docs/operacao.md`
- `SMTP_USER`/`SMTP_PASS`, `VAPID_*`, `CRON_SECRET`, `NOTIFY_ALLOWLIST` (só staging); os testes zeram SMTP e VAPID: nada sai dos testes
- `SCHEDULE_NOW` só no e2e (`getNow` exige `E2E=1` e ignora na Vercel)

Notificações: envio sempre depois do commit (`runInBackground`/`waitUntil`, páginas com `maxDuration = 60`), idempotente por `NotificationLog.key`, reenvio só se a falha do SMTP foi antes da mensagem (`smtp-errors.ts`).

## Workflow

Antes de alterar código:
1. Liste arquivos que serão criados/alterados e motivo
2. Aguarde confirmação antes de implementar

Ao implementar:
- Server Components por padrão; `"use client"` apenas quando necessário (o que vai para client component vai para o navegador: `select` só do necessário)
- Server Actions em `app/_actions/`, protegidas por sessão no servidor e com entrada validada (zod)
- TypeScript estrito, evitar `any`; UI consistente com shadcn/Tailwind
- Corrigir apenas o necessário, sem refatorar o projeto inteiro

## Regras do redesign

- Cores: `--primary` `#7354F5` para botões com texto branco; `--accent` `#8162FF` para destaques. Contraste mínimo 4,5:1; alvo de toque mínimo 44px
- Animações só com `motion-safe:` (respeitar "reduzir movimento"); nada anima no primeiro carregamento
- Mudança nova visível ao cliente entra atrás de feature flag (`off | admin | all`) até o aceite
- Migrações do Prisma só aditivas (nada de drop/rename destrutivo); produção recebe SQL manual com backup (`docs/operacao.md`)
- **Nunca** fazer commit, push ou deploy sem autorização explícita do usuário. Nunca rodar nada contra produção
- A `main` é protegida (PR + check `testes`): nada de commit direto. O registro em `docs/progresso.md` vai **dentro do próprio PR** ("publicado em produção — previsto após o merge")
- Nenhum merge em produção de sexta 20h até sábado 21h (SP)
