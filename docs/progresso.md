# Progresso do redesign

| Prompt | Status | Data | Branch |
|---|---|---|---|
| 0 · Preparação | ✅ Concluído | 2026-10-14 | `mel-000/preparacao` |
| 1 · Chave do login + Analytics | ✅ Concluído | 2026-10-14 | `fase1/secret-analytics` |

## Prompt 0 · Preparação

**Commits:** ver `git log mel-000/preparacao` (`docs(MEL-000): ...`).

**Feito:**
- Conferências no código (grade, `@@unique`, barbearia "Indisponivel", secret, admin hardcoded, serviços, testes) — sem alterar código.
- `CLAUDE.md` versionado com a seção "Regras do redesign".

**Decisões:**
- Código MEL não informado para esta etapa → usado `MEL-000`.
- `npm test` não existe (sem test runner); considerado "não se aplica" até o Prompt 4. `npm run lint` passou.
- `docs/redesign-spec.md` não existe no repositório; conferência feita só contra o texto do prompt.
- Arquivos fora do escopo (`package.json`, `package-lock.json`, `.agents/`, `bookings-duplicados.txt`, `skills-lock.json`) não entraram no commit.

**Pendências / achados para os próximos prompts:**
- Doc diz `NEXT_AUTH_SECRET`, mas código e `.env` usam `NEXTAUTH_SECRET` (`app/_lib/auth.ts:91`) → Prompt 1.
- Admin por id/e-mail em `auth.ts`, `side-menu.tsx`, `save-booking.ts`; 1 usuário já tem `isAdmin = true` no banco → Prompt 2.
- `saveBooking` aceita `userId` do cliente sem checar a sessão → Prompt 3.
- `@@unique([barbershopId, date])` é por barbearia, não global → Prompt 3.
- Calendário libera sexta/sábado da semana atual, não "a próxima" → Prompt 6.
- Grade e filtro de horários usam o fuso do navegador → Prompt 6.
- Barbearia "Indisponivel" tem 12 reservas ligadas e aparece na home → Prompt 7 (esconder, não apagar).
- Serviços sem `orderBy`; `prisma/seed.ts` desatualizado em relação ao banco.
- Nenhuma configuração de testes → Prompt 4.

## Prompt 1 · Chave do login + Analytics

**Feito:**
- `NEXTAUTH_SECRET` já era o único nome lido (`app/_lib/auth.ts:91`); corrigidos `CLAUDE.md` e `app/.claude/CLAUDE.md`; criado `.env.example`.
- `<Analytics />` e `<SpeedInsights />` em `app/layout.tsx`.
- `app/_lib/track.ts` (ponto único de eventos) + eventos `booking_started`, `login_from_booking`, `booking_confirmed`, `booking_failed` (`service-item.tsx`) e `booking_cancelled` (`booking-item.tsx`, `booking-item-adm.tsx`).
- `app/_lib/metrics.ts` → `getBookingMetrics(desde, ate)`: confirmadas + total por semana (segunda-feira, UTC).
- Vitest 3 (`npm test`, `vitest.config.mts`) + `app/_lib/metrics.test.ts`.

**Decisões:**
- Plano Hobby: eventos personalizados não aparecem no painel; critério de aceite não depende deles.
- Canceladas fora das métricas: cancelamento apaga a reserva → Prompt 3.
- Vitest 3 em vez do 5 (o 5 exige `@types/node` ≥ 22; projeto usa 20).
- `getBookingMetrics` conferida contra SQL direto no banco do `.env`: 2774 reservas, 132 semanas, iguais.
- Reservas da barbearia "Indisponivel" entram na contagem (decidir no Prompt 7).
- `app/.claude/` está no `.gitignore`: a correção do `app/.claude/CLAUDE.md` é só local.

**Vercel (registrado em 2026-10-14):**
- `NEXTAUTH_SECRET` criada em Production com o mesmo valor da chave antiga; redeploy feito e login testado no site real ✅.
- `NEXT_AUTH_SECRET` mantida por segurança até a Fase 1 ir ao ar.
- `NEXTAUTH_SECRET` também já existe em Preview (criada como variável separada, ambiente Preview).
- Vercel desativou Node 20; projeto usa Node 24.x → `"engines": { "node": "24.x" }` no `package.json`. Node local: v24.14.1.

**Pendências:**
- [ ] Apagar `NEXT_AUTH_SECRET` quando a Fase 1 for ao ar.
