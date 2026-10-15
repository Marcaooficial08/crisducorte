# Progresso do redesign

| Prompt | Status | Data | Branch |
|---|---|---|---|
| 0 · Preparação | ✅ Concluído | 2026-10-14 | `mel-000/preparacao` |
| 1 · Chave do login + Analytics | ✅ Concluído | 2026-10-14 | `fase1/secret-analytics` |
| 2 · Admin pelo isAdmin | ✅ Publicado em produção | 2026-10-15 | `fase1/is-admin` (PR #2) |
| 3 · Reservas seguras e leves | ✅ Publicado em produção | 2026-10-15 | `fase1/bookings-seguros` (PR #3) |
| 4 · Testes automáticos | ✅ Publicado em produção — previsto após o merge | 2026-10-15 | `fase1/testes` (PR #4) |

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

## Prompt 2 · Admin pelo isAdmin (MEL-014)

**Feito:**
- `isAdmin` na sessão (session callback lê `User.isAdmin` do banco a cada requisição); `hasFullAccess` removido.
- `app/_lib/auth-guards.ts` com `assertUser`/`assertAdmin` + testes (`auth-guards.test.ts`).
- `/adm` usa `assertAdmin` (falhou → home); `cancelBooking` usa `assertUser` + dono ou admin; home e menu lateral usam `isAdmin`.
- Removidos ids/e-mail fixos de `auth.ts`, `side-menu.tsx`, `save-booking.ts`.
- `npm run set-admin -- email` (`prisma/scripts/set-admin.ts`): mostra o host, pede confirmação.
- Fallback temporário: sem nenhum `isAdmin` no banco, o e-mail antigo do Cris continua admin com `console.warn` (TODO MEL-014: remover no próximo PR).

**Decisões:**
- Banco local passou a ser o Neon (dev), com cópia de `Barbershop` e `Service` de produção (mesmos ids, sem dados de cliente).
- `redirectSpecialBookings` e os dois `getUserBookings` removidos: nenhum código os chamava (conferido no histórico do Git), então nada muda no `/adm` nem em "Meus agendamentos". Reservas já movidas no passado não foram corrigidas.
- Em dev o admin é `marcoscaramu@gmail.com`; em produção será o e-mail do Cris (no deploy).

**Teste de aceite (localhost, banco Neon) ✅:** com `marcoscaramu@gmail.com` (isAdmin no Neon) `/adm` abre; com outra conta Google `/adm` volta para a home.

**Produção (2026-10-15) ✅:** PR #2 mergeado na `main` (`67a0ecf`) e publicado pela Vercel. Testado no site real: o Cris vê "Agendamentos Clientes" e abre o `/adm`; outra conta aparece como usuário comum.

**Pendências:**
- [x] Produção: rodar `set-admin` com o e-mail do Cris — não se aplica — o Cris já é admin em produção (isAdmin = true).
- [x] Próximo PR: remover o fallback do e-mail antigo — feito no Prompt 3.

## Prompt 3 · Reservas seguras e leves

**Feito:**
- `saveBooking`: `userId` sempre da sessão (`assertUser`); parâmetro `userId` removido do cliente (`service-item.tsx`). Sem sessão → "Faça login para agendar."
- Rate limit em memória (`app/_lib/rate-limit.ts`): 10 por minuto por usuário em `saveBooking` e `cancelBooking` → "Muitas tentativas seguidas. Aguarde 1 minuto."
- `cancelBooking` passa a retornar `{ success, error }` (em produção o Next esconde a mensagem de erros lançados); `booking-item.tsx` e `booking-item-adm.tsx` mostram o erro no toast.
- Fallback do e-mail antigo do Cris removido de `auth.ts` (TODO MEL-014) e do `CLAUDE.md`.
- `getAllBookings` (findMany sem filtro, sem uso) removido de `app/_lib/prisma.ts`.
- `handledaleClick` → `handleDateClick`.
- Testes: `rate-limit.test.ts`, `save-booking.test.ts`.

**Já feito no Prompt 2 (só conferido):** `redirectSpecialBookings`, `getUserBookings` duplicado e as linhas em branco do `auth.ts`. `/bookings` já filtra por `userId` da sessão e não grava nada.

**Decisões:**
- Rate limit em memória: por instância da Vercel, não global (aprovado).

**Teste de aceite (localhost, banco Neon) ✅:** reservar e cancelar como admin e como cliente; cada conta vê só as próprias reservas; `/adm` ok. Aviso do rate limit validado por teste automatizado, não reproduzido manualmente.

**Produção (2026-10-15) ✅:** PR #3 mergeado na `main` (`96b3b7d`) e publicado pela Vercel. Testado no site real: reservar, cancelar e `/adm` funcionando.

**Pendências:**
- [ ] Prompt 16: tratar os 12 pares de reservas no mesmo horário (Cris Du Corte + Indisponivel) antes de um `@@unique` só por data.

**Consulta em produção (só leitura, `READ ONLY`, 2026-10-15) — para Prompts 7 e 16:**
- Cris Du Corte: 2765 reservas no total, 282 nos últimos 90 dias.
- Indisponivel: 12 no total, 0 nos últimos 90 dias (de 2024-05-17 a 2026-05-16); todas de contas sem `isAdmin`.
- Horários com reserva nas duas barbearias ao mesmo tempo: 12 no total, 0 nos últimos 90 dias, 0 futuros.

## Prompt 4 · Testes automáticos (MEL-018)

**Feito:**
- Vitest 3 → 5.0.5 e `@types/node` 20 → 24 (Node 24 já era o da Vercel); Playwright 1.64.
- Scripts: `test` (unit + integração), `test:unit`, `test:int`, `test:e2e`.
- Regra de dias: `getNextServiceDays(agora)` + `TIME_GRID` + `AGENDA_CLOSED_MESSAGE` em `app/_lib/schedule.ts`, com testes de segunda a domingo, horários passados, fuso e virada de mês. **Ainda não ligada na tela** (Prompt 6, atrás de feature flag).
- Unit (mocks): grade de 11 horários (`hours.test.ts`), `cancelBooking` (dono ok, outro cliente recusado, admin ok), `/adm` (sem sessão e conta comum → home sem ler reservas; admin abre).
- Integração (Postgres real, `tests/integration/bookings.int.test.ts`): reservar horário livre; dois clientes **ao mesmo tempo** no mesmo horário → só um grava, o outro recebe "Horário já reservado. Escolha outro."; cancelar a própria reserva; cancelar a de outro → recusado; admin cancela.
- E2E (Playwright, `e2e/fluxos.spec.ts`, contra `next start`): home deslogada; cliente reserva pelo calendário e vê em "Meus agendamentos"; cliente em `/adm` → home; admin abre `/adm` e vê a reserva.
- Login simulado sem Google: o setup cria `User` + `Session` no banco de teste e o Playwright envia o cookie `next-auth.session-token`. Nenhuma rota de teste no app.
- Trava (`tests/setup/test-database-url.ts`): integração e e2e só usam `TEST_DATABASE_URL`; recusam host Supabase e o mesmo host do `DATABASE_URL`. Sem a variável, a integração é pulada.
- GitHub Actions (`.github/workflows/testes.yml`, job `testes`): em todo PR e push na `main` → lint, unit, integração, build, e2e, com Postgres 16 temporário dentro do job.
- `CLAUDE.md`: comandos de teste, `TEST_DATABASE_URL` e a regra nova de registro no PR.

**Decisões:**
- **Regra de dias (decisão do dono, 2026-10-15, substitui a da spec):** a agenda abre na segunda só para a sexta e o sábado daquela semana (fuso São Paulo). Seg–qui: sexta e sábado; sexta: sexta (só horários futuros) e sábado; sábado: só o sábado (só horários futuros); domingo: nenhum dia, com "A agenda da próxima semana abre na segunda-feira"; dia sem horário futuro sai da lista. Horário igual ao "agora" conta como passado. Atualizado em `docs/redesign-spec.md` §1 e `CLAUDE.md`.
- Função criada como `getNextServiceDays` em `app/_lib/schedule.ts` (nome e lugar que o Prompt 6 já usa), em vez de `booking-days.ts` do plano.
- Banco de testes: local = branch "Testes" do Neon (host `ep-bitter-pond…`, separado da dev); CI = Postgres temporário do Actions (grátis, sem secrets).
- Ainda não existe action exclusiva de admin; o acesso de admin foi testado em `/adm` e no `cancelBooking`. Actions futuras ganham testes nos seus prompts.
- E2E depende da tela atual (calendário); será ajustado no Prompt 14.
- **Processo:** com a `main` protegida, o registro "publicado em produção" entra no próprio PR como "previsto após o merge"; sem commit direto na `main`.

**Validação (local, 2026-10-15):** `npm run lint` ✅ · `npm run test:unit` 40 ✅ · `npm run test:int` 6 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 4 ✅ (duas execuções seguidas).

**Pendências:**
- [ ] Ativar no GitHub a regra da `main` exigindo o check `testes` (passo a passo no PR #4).
- [ ] Conferir o primeiro run do workflow no PR #4.
