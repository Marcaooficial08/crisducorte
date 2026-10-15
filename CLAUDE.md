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
- `DATABASE_URL` — PostgreSQL
- `TEST_DATABASE_URL` — banco só de testes (opcional; necessário para `test:int` e `test:e2e`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET` — único nome lido pelo NextAuth (`app/_lib/auth.ts`); modelo em `.env.example`

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
