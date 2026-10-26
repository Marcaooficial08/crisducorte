# Cris du Corte — agendamento

App de agendamento da barbearia Cris du Corte (Belo Horizonte): o cliente reserva pelo celular na sexta ou no sábado da semana; o Cris administra a agenda, os bloqueios, as reservas na mão e os mensalistas pelo `/adm`.

Produção: https://crisducorte.vercel.app · Testes (staging): https://crisducorte-staging.vercel.app

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma + PostgreSQL · NextAuth v4 (Google) · Vercel (Hobby). E-mail por Gmail SMTP (nodemailer), Web Push (`web-push`), PWA com service worker escrito à mão.

## Como rodar

Requisitos: Node 24 (o mesmo da Vercel) e um banco Postgres (local usamos o Neon dev).

```bash
cp .env.example .env      # preencha DATABASE_URL, GOOGLE_CLIENT_*, NEXTAUTH_SECRET…
npm install               # roda o prisma generate
npx prisma migrate dev    # aplica as migrações no banco do .env
npm run dev               # http://localhost:3000
```

Para virar admin no banco local: entre uma vez com a conta Google e rode `npm run set-admin -- seu@email.com` (mostra o host do banco e pede confirmação).

## Testes

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npx tsc --noEmit` | Tipos do app, dos testes e do e2e |
| `npm run test:unit` | Vitest com mocks (`app/**/*.test.ts`) |
| `npm run test:coverage` | Unit + relatório de cobertura (`coverage/`) |
| `npm run test:int` | Vitest com Postgres real (`tests/integration`) |
| `npm run build` | Build de produção |
| `npm run test:e2e` | Playwright contra o `next start` (rode `npm run build` antes) |

Integração e e2e **apagam dados**: usam só o `TEST_DATABASE_URL` (local: branch "testes" do Neon; CI: Postgres temporário). A trava em `tests/setup/test-database-url.ts` recusa Supabase/produção e o mesmo host do `DATABASE_URL`. Rode um de cada vez (os dois no mesmo banco se atrapalham).

O CI (`.github/workflows/testes.yml`) roda lint, `tsc`, unit, integração, build e e2e em todo PR; o check `testes` é obrigatório para o merge na `main`.

## Ambientes

| Ambiente | Branch | Banco | Observação |
|---|---|---|---|
| Produção | `main` | Supabase | Runtime: Transaction pooler (porta **6543**, `?pgbouncer=true&connection_limit=1`) |
| Staging | `staging` (Preview da Vercel) | Neon dev | Atualizar com `git push origin <branch>:staging --force` |
| Local | — | Neon dev | `.env` |
| Testes | — | Neon "testes" / Postgres do CI | `TEST_DATABASE_URL` |

Variáveis: ver `.env.example` (todas comentadas). Nunca commite `.env*`.

## Flags (botões de desligar)

Só três, todas `off | admin | all` (padrão `off`), lidas em `app/_lib/flags.ts`:

| Flag | Desliga |
|---|---|
| `NOTIFICACOES` | E-mails (confirmação, lembrete, avisos) e o botão do WhatsApp na reserva |
| `WEB_PUSH` | Notificações no celular (switch do Perfil, lembrete e "o Cris cancelou" por push) |
| `PWA_INSTALL` | Dica "Instale o app"; com ela **e** `WEB_PUSH` em `off`, o service worker se remove dos aparelhos |

Como ligar/desligar e o que conferir: `docs/operacao.md`.

## Como publicar

1. Branch a partir da `main` (a `main` é protegida: só por PR, com o check `testes`).
2. Lint, `tsc`, unit, integração, build e e2e locais, um de cada vez.
3. `git push origin <branch>:staging --force` e teste no celular.
4. PR → merge → a Vercel publica a `main` em Production.
5. Registro em `docs/progresso.md` dentro do próprio PR.

**Janela sem merge:** nada vai para produção de sexta 20h até sábado 21h (horário de SP) — sábado é o dia de movimento.

## Migração em produção e backup

A Vercel não roda migração no build. Migrações são só aditivas e aplicadas à mão, com backup antes — passo a passo em `docs/operacao.md` ("Migração em produção" e "Backup").

## Documentos

- `docs/operacao.md` — dia a dia: flags, notificações, Cron, rollback, backup, migração.
- `docs/progresso.md` — histórico de cada prompt/PR, decisões e validações.
- `docs/redesign-spec.md` — especificação do redesign (regras da agenda, telas, textos).
- `CLAUDE.md` — instruções para o Claude Code neste repositório.
