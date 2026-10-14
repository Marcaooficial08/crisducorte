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

No test runner configured.

## Stack

Next.js 14 App Router · TypeScript (strict) · Tailwind · shadcn/ui (Radix primitives, config `components.json`) · Prisma + PostgreSQL · NextAuth v4 (Google provider + Prisma adapter).

Path alias `@/*` → repo root (e.g. `@/app/_lib/prisma`).

## Architecture

All routes live under `app/`. Underscore folders are non-route by convention:

- `app/_lib/` — shared singletons: `prisma.ts` exports `db`, `auth.ts` exports `authOptions` + `getUserBookings`, `utils.ts` exports `cn`
- `app/_components/ui/` — shadcn primitives
- `app/_components/` — shared layout components (Header, Footer, SideMenu, BookingItem, etc.)
- `app/_actions/` — Server Actions (e.g. `cancel-booking.ts`)
- `app/_providers/` — client context providers (mounted in `app/layout.tsx`)
- Route segments: `(home)`, `barbershop/[id]`, `bookings`, `adm`, `api/auth/[...nextauth]`
- `pages/_document.tsx` — legacy shim, do not add routes here

**Data model:** `User ↔ Booking ↔ Service ↔ Barbershop`. NextAuth tables coexist (`Account`, `Session`, `VerificationToken`, `VerificationRequest`). `User.isAdmin` field exists but admin gating uses hardcoded user IDs (see below).

## Business Rules (não tratar como bug sem confirmação)

- Agendamentos apenas sexta e sábado
- Horários fixos: 9:00, 10:30, 11:30 … 19:30 (gerados em `barbershop/[id]/_helpers/hours.ts`)
- Agenda abre na segunda-feira para a semana seguinte (sexta/sábado)

## Admin / Special-User Logic (load-bearing, non-obvious)

`getUserBookings` em `app/_lib/auth.ts` tem **efeito colateral de escrita**: toda chamada redireciona agendamentos do userId `clu79mptd0000tvy12eh8254l` (conta especial) para `clu79vlr300001l7m8izc642g`, depois retorna visão mesclada ao usuário especial. O session callback marca `hasFullAccess: true` para esse mesmo id.

- Não assumir que `getUserBookings` é somente leitura
- IDs hardcoded não funcionam em outros ambientes — preservar até substituir o modelo admin por `User.isAdmin`
- Novas features admin: estender a flag `hasFullAccess` na sessão, não espalhar mais checks de id

## Environment

`.env` necessário:
- `DATABASE_URL` — PostgreSQL
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

- Atendimento só na **próxima sexta** e no **próximo sábado**
- Grade fixa de 11 horários, igual nos dois dias: 09:00, 10:30, 11:30, 12:30, 13:30, 14:30, 15:30, 16:30, 17:30, 18:30, 19:30
- Todo serviço ocupa exatamente 1 horário
- Admin definido por `User.isAdmin` — nunca por e-mail ou id escrito no código
- Cores: `--primary` `#7354F5` para botões com texto branco; `--accent` `#8162FF` para destaques
- Contraste mínimo 4,5:1; alvo de toque mínimo 44px
- Toda mudança visível ao cliente fica atrás de feature flag
- Migrações do Prisma só aditivas (nada de drop/rename destrutivo)
- **Nunca** fazer commit, push ou deploy sem autorização explícita do usuário
