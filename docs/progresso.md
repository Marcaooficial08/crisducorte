# Progresso do redesign

| Prompt | Status | Data | Branch |
|---|---|---|---|
| 0 · Preparação | ✅ Concluído | 2026-10-14 | `mel-000/preparacao` |
| 1 · Chave do login + Analytics | ✅ Concluído | 2026-10-14 | `fase1/secret-analytics` |
| 2 · Admin pelo isAdmin | ✅ Publicado em produção | 2026-10-15 | `fase1/is-admin` (PR #2) |
| 3 · Reservas seguras e leves | ✅ Publicado em produção | 2026-10-15 | `fase1/bookings-seguros` (PR #3) |
| 4 · Testes automáticos | ✅ Publicado em produção | 2026-10-15 | `fase1/testes` (PR #4) |
| 5 · LGPD básica | ✅ Publicado em produção | 2026-10-16 | `fase1/lgpd` |
| 6 · Dias e grade (AGENDA_V2) | ✅ Publicado em produção | 2026-10-16 | `fase1/dias-grade` |
| 7 · Marca e textos | ✅ Publicado em produção | 2026-10-16 | `fase1/marca` (PR #7) |
| 8 · Contraste e alvos de toque | ✅ Publicado em produção | 2026-10-16 | `fase1/contraste` (PR #8) |
| 9 · SEO e imagens | ✅ Publicado em produção | 2026-10-16 | `fase1/seo-imagens` (PR #9) |
| 10 · Tokens, fontes e escala | ✅ Publicado em produção | 2026-10-16 | `fase2/tokens` (PR #10) |
| 11 · Vidro, brilho e luz ambiente | ✅ Publicado em produção | 2026-10-16 | `fase2/visual-b` (PR #11) |
| 12 · Estados (vazio, erro, carregando) | ✅ Publicado em produção | 2026-10-16 | `fase2/estados` (PR #12) |
| 13 · Menu lateral acessível | ✅ Publicado em produção | 2026-10-16 | `fase2/menu` (PR #13) |
| 14 · Home nova (NEW_HOME) | ✅ Publicado em produção | 2026-10-17 | `fase2/home-nova` (PR #14) |
| 15 · Voltar com a seleção após o login | ✅ Publicado em produção | 2026-10-17 | `fase2/login-resume` (PR #15) |
| 16 · Schema da Fase 3 + disponibilidade | ✅ Publicado em produção | 2026-10-19 | `fase3/schema` (PR #16) |
| 17 · Painel do admin (bloqueios, reserva manual, métricas) | ✅ Publicado em produção | 2026-10-19 | `fase3/painel-admin` (PR #17) |
| Incidente · Conexão de produção (transaction pooler) | ✅ Publicado em produção — previsto após o merge | 2026-10-19 | `docs/pool-producao` |
| 19 · Notificações (MEL-022) | ✅ Publicado em produção — previsto após o merge | 2026-10-21 | `fase3/notificacoes` (PR #20) |

## Ambientes

| Ambiente | URL | Origem | Banco | Observações |
|---|---|---|---|---|
| Produção | https://crisducorte.vercel.app | branch `main` | Supabase | Só leitura para conferências. Runtime: Transaction pooler (6543, `?pgbouncer=true&connection_limit=1`); backup e `migrate resolve/status`: 5432 (`.env.producao-backup`) |
| Testes (staging) | https://crisducorte-staging.vercel.app | branch `staging` (Preview da Vercel) | Neon dev | `NEXTAUTH_URL` próprio; login Google funcionando. Atualizar com `git push origin <branch>:staging --force` antes do PR, para teste no celular |

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
- [x] Ativar no GitHub a regra da `main` exigindo o check `testes` — feito: ruleset "Proteger main" ativo (PR obrigatório, check `testes` obrigatório, sem force push, sem apagar a branch). Conferido pela API do GitHub em 2026-10-16.
- [x] Conferir o primeiro run do workflow no PR #4 — passou (2m31s).

**Produção ✅:** PR #4 mergeado na `main` (`51f05b8`). Não muda nada visível para o cliente.

## Prompt 5 · LGPD básica (MEL-016)

**Feito:**
- `/privacidade`: Política de Privacidade em português simples (responsável, dados coletados, finalidade, base legal, compartilhamento, prazo de guarda, direitos e como excluir a conta). Responsável: Cris du Corte; contato: WhatsApp (31) 97357-6347 (`wa.me`); atualizada em 16/10/2026. Comentário no topo do arquivo: revisão jurídica antes de divulgar.
- Login pelo menu: "Ao entrar, você concorda com a Política de Privacidade" com link.
- Link "Privacidade" no rodapé e no menu; item "Perfil" no menu (logado).
- `/perfil` (só logado): avatar, nome, e-mail e "Excluir minha conta" com AlertDialog.
- `deleteAccount` (`app/_actions/delete-account.ts`): `assertUser` + rate limit; numa transação apaga as reservas futuras, deixa as passadas com `userId = null`, apaga Session, Account e User; limpa o cookie da sessão.
- Admin (`isAdmin`) não exclui pelo app: a tela mostra "Conta de administrador não pode ser excluída por aqui" e a action também recusa.
- Migração `20261016000000_booking_user_optional`: `Booking.userId` passa a ser opcional (`DROP NOT NULL`; chave estrangeira continua `RESTRICT`). `/adm` mostra "Conta excluída" nessas reservas.
- Testes: unit (`delete-account.test.ts`), integração (`tests/integration/delete-account.int.test.ts`) e e2e (`e2e/lgpd.spec.ts`: rodapé → política; admin sem botão; cliente exclui a conta e perde o acesso).

**Decisões:**
- **A1 (dono, 2026-10-16):** reservas passadas ficam no histórico sem dono, em vez de apagadas — métricas do Cris preservadas, sem dado pessoal.
- **B1 (dono, 2026-10-16):** sem feature flag (exceção à regra): é exigência legal e as flags só chegam no Prompt 14.
- Política sem CPF/CNPJ, endereço e cidade/UF (decisão do dono): não aparecem no texto.
- Aviso de consentimento ao reservar sem login (botão "Reservar" chama o Google direto) → Prompt 15.
- Sem `signOut()` depois de excluir: a sessão já não existe e o NextAuth registraria `SIGNOUT_ERROR`; a action apaga o cookie e a tela recarrega a home.
- Banco: só Neon (dev e "Testes"). Produção não foi tocada.

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 44 ✅ · `npm run test:int` 8 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 7 ✅.

**Teste de aceite (localhost, banco Neon) ✅:** conta comum exclui a própria conta; admin vê o bloqueio e não exclui.

**Migração em produção (2026-10-16) ✅** — a Vercel não roda `prisma migrate deploy` no build, então foi feito à mão:
- Backup `pg_dump` de produção feito antes, fora do Git.
- `ALTER TABLE "Booking" ALTER COLUMN "userId" DROP NOT NULL;` aplicado pelo dono no SQL Editor do Supabase.
- Conferido: `is_nullable = YES`; 2781 reservas intactas.
- Registrada no histórico com `npx prisma migrate resolve --applied 20261016000000_booking_user_optional`; `migrate status` → "Database schema is up to date!".

**Pendências:**
- [ ] Revisão jurídica da política antes de divulgar o link.
- [ ] Depois do merge: testar a exclusão no site real com uma conta de teste (nunca a do Cris).

## Prompt 6 · Dias e grade na tela (AGENDA_V2)

**Feito:**
- `getNextServiceDays` conferida: já seguia a regra (fuso SP; seg–qui sexta e sábado; sexta só horários futuros + sábado; sábado só o sábado; domingo nada; dia sem horário futuro sai). Não precisou de correção.
- Feature flag genérica `app/_lib/flags.ts`: `isEnabled(flag, session)` lê `process.env[flag]` com `off | admin | all` (ausente/inválido = `off`); atalho `isAgendaV2Enabled`. Pronta para `NEW_HOME`/`NEW_THEME` (Prompt 14).
- `/barbershop/[id]`: com a flag ligada, o servidor calcula `getNextServiceDays(new Date())` e passa ao `ServiceItem`. Calendário só habilita esses dias; horários = `day.times` menos os reservados (comparados no fuso SP); a data enviada é montada com `fromZonedTime` (não mais o fuso do navegador). Sem dia liberado → "A agenda da próxima semana abre na segunda-feira" no lugar do calendário.
- `saveBooking`: com a flag ligada para o usuário, recusa dia fora dos liberados, horário fora da grade, horário passado (ou com segundos) → "Esse horário não está mais disponível." (`isBookableSlot` em `schedule.ts`). Na recusa, a tela mostra o toast, recarrega as reservas do dia e faz `router.refresh()`: o horário vencido some.
- `_helpers/hours.ts` (`generateDayTimeList`) removido; a agenda antiga usa `TIME_GRID` (mesmos 11 horários).
- `AGENDA_V2` em `.env.example` e `CLAUDE.md`.
- Testes: `flags.test.ts`; `schedule.test.ts` (+ sexta à tarde, grade de 11, `isBookableSlot`); `save-booking.test.ts` (off/admin/all); integração `tests/integration/agenda-v2.int.test.ts` (relógio fixo: recusa sábado da semana seguinte, horário fora da grade e horário passado; aceita horário liberado; reserva antiga fora da regra continua intacta).

**Decisões:**
- Dias e horários calculados só no servidor (relógio do celular pode estar errado); página aberta por muito tempo é coberta pela validação do `saveBooking`.
- Flag `off`: tela e `saveBooking` iguais a antes (inclusive o fuso do navegador). `admin`: só quem tem `isAdmin` vê e usa a regra nova.
- Nenhuma reserva existente é alterada ou apagada; a regra só vale para reservas novas. Sem migração.
- Sem e2e novo (decisão do dono): unit + integração com relógio fixo.
- Código MEL não identificado na spec para este prompt → commits com escopo `agenda`.
- Banco: só Neon ("Testes"). Produção não foi tocada.

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 59 ✅ · `npm run test:int` 12 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 7 ✅.

**Teste de aceite (localhost, banco Neon, `AGENDA_V2=admin`) ✅:** admin vê a regra nova; cliente comum vê a antiga.

**Pendências:**
- [ ] Vercel: criar `AGENDA_V2` (Production e Preview); começar com `admin`, depois `all`.

## Prompt 7 · Marca e textos

**Feito:**
- Header: tesoura (lucide `Scissors`) em quadrado de 36px com borda `#8162FF` + "Cris du Corte" em Permanent Marker (`next/font`, `font-brand` no Tailwind); link com `aria-label="Cris du Corte — início"`.
- Ícones `app/icon.png` (512) e `app/apple-icon.png` (180) recortados do brasão de `public/brand/logo.jpeg` (sem a marca ✦), fundo `#15161A`, gerados com sharp fora do projeto. `logo.jpeg` original intacto.
- Removidos: `public/Logo.png` (imagem do template antigo), `app/favicon.ico`, `public/favicon.ico`, `public/ico16.png`, `public/icon.tsx` e o `<link rel="icon">` manual do layout. `public/icon.png` mantido.
- Textos: "Olá, vamos agendar um corte?" / "Olá, [nome]!"; rodapé `© {ano atual} Cris du Corte`; "Agendamentos dos clientes" no `/adm` e no menu.
- Sem avaliação inventada: saiu o selo "5,0" do card e "5,0 (1254 avaliações)" da página da barbearia.
- Barbearia "Indisponivel" fora da home (`visibleBarbershopWhere` em `app/_lib/barbershops.ts`); continua no banco com as reservas e `/barbershop/[id]` dela abre.
- Home com uma barbearia só: card de Recomendados/Populares limitado a `max-w-sm` (384px) no computador; no celular fica igual. Imagem segue com altura fixa e `object-cover` (sem esticar).
- Card da home e topo de `/barbershop/[id]` usam `public/brand/logo-card.jpg` (recorte quadrado do logo oficial `logo.jpeg` no brasão, sem a ✦, com o fundo da foto; gerado com sharp; next/image, `object-contain`, quadrado até `max-w-sm`, fundo `#15161A`) no lugar do `imageUrl` do banco; o `imageUrl` não foi alterado.
- `tmp/` no `.gitignore` (prints de referência locais).
- Testes: `barbershops.test.ts`, `tests/integration/barbershops.int.test.ts`, `e2e/marca.spec.ts` (header, saudação, rodapé com o ano atual, sem "5,0").

**Decisões:**
- Rebrand sem feature flag (decisão do dono).
- "Indisponivel" escondida pelo nome (sem coluna nova: banco não foi alterado).
- Busca quebrada (`/barbershop?search=`) mantida; sai no Prompt 14.
- Imagens de Barbershop/Service são todas URLs `utfs.io` (conferido em produção, só leitura, e no Neon dev): nada em `public/` era usado pelo banco.
- `/privacidade` é estática: o ano do rodapé lá é o do build (atualiza no próximo deploy).
- Agenda (`schedule.ts`, `AGENDA_V2`) e banco não foram tocados.

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 60 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 8 ✅ · busca pelo nome do template antigo no repositório: nada.

**Produção (2026-10-16) ✅:** PR #7 mergeado na `main` (`f1d90c4`) e publicado pela Vercel. Validado pelo dono no site real.

## Prompt 8 · Contraste e alvos de toque

**Feito:**
- Tokens em `app/globals.css` (tabela da spec §2): `--primary` #7354F5 (botões com texto branco, ~4,9:1); `--accent` #8162FF (ícones, bordas, destaques); `--accent-soft` #B7A6FF (texto roxo sobre fundo escuro, `text-accent-soft` no Tailwind); `--secondary` #22232A, `--muted` #2E3038 e `--muted-foreground` #A1A1AA separados; `--ring` #8162FF (anel de foco).
- Branco sobre #8162FF dá só ~4,1:1, então nenhum texto fica sobre `bg-accent`: hover de `outline`/`ghost` usa `bg-secondary`; no calendário só o "hoje" tem borda accent; dia e horário selecionados são `bg-primary` com texto branco.
- `text-gray-400` → `text-muted-foreground` em todas as telas; `opacity-75` saiu do rodapé. Badge "Confirmado", preço do serviço e link usam `text-accent-soft` (o roxo antigo dava 3,9–4,2:1).
- 44px: botões `default`, `sm`, `lg` e `icon` com `h-11`; dias e setas do calendário com 44px; X de fechar dos sheets com 44px e "Fechar". Sheet da reserva com largura total no celular: calendário cabe em 390px sem rolagem horizontal.
- `aria-label` em "Abrir menu" (header e barbearia), "Buscar", "Voltar" e "Sair"; o `onClick` do logout foi do ícone para o `<button>`. Ícones decorativos com `aria-hidden`.
- Card de reserva (`booking-item`, `booking-item-adm`) dentro de um `<button>` de verdade (antes: `<div>` com `aria-expanded`). Avatares com `alt`.
- Teste: `e2e/acessibilidade.spec.ts` (nomes acessíveis, alvos de 44px, setas nos cantos, sem rolagem horizontal em 390px).

**Decisões:**
- Sem feature flag (decisão do dono): correção de acessibilidade.
- Fundo e card não mudaram; o resto da paleta da spec fica para o Prompt 14 (`NEW_THEME`).
- Agenda (`schedule.ts`, `AGENDA_V2`), logo/marca do Prompt 7 e banco não foram tocados. Em `service-item.tsx` mudaram só classes e a largura das setas.

**Lighthouse acessibilidade (local, `next start`, banco Neon "Testes", cliente logado por cookie), antes → depois:**

| Página | Celular | Desktop |
|---|---|---|
| Home | 78 → 100 | 78 → 100 |
| Barbearia | 89 → 100 | 89 → 100 |
| `/bookings` | 77 → 100 | 77 → 100 |

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 60 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 10 ✅.

**Produção (2026-10-16) ✅:** PR #8 mergeado na `main` (`9e452a5`) e publicado pela Vercel. Validado pelo dono no site real.

**Pendências:**
- [ ] Prompt 14: a seção "Agendamentos" da home (NextBookingCard) deve mostrar só reservas futuras. Hoje ela busca desde a segunda-feira da semana (`gte: startOfWeek`, `app/(home)/page.tsx`), então uma reserva de hoje já passada aparece como "Finalizado". Já acontecia na `main` antes deste prompt; não alterado aqui.

## Prompt 9 · SEO e imagens

**Feito:**
- `sizes` pelo tamanho exibido: card da home `(min-width: 424px) 384px, calc(100vw - 40px)` (ou `167px` com várias barbearias, nova prop do `BarbershopItem`); topo da barbearia `(min-width: 384px) 384px, 100vw`; serviços (utfs.io) `110px` (antes sem `sizes` = 100vw); mapa do sheet da reserva `(min-width: 640px) 344px, calc(75vw - 40px)`. Primeiro card da home com `priority` (preload com `fetchPriority="high"`).
- `app/layout.tsx`: `metadataBase` https://crisducorte.vercel.app, título `Cris du Corte` com modelo `%s · Cris du Corte`, descrição nova, `openGraph` (`pt_BR`, `website`) e `twitter` (`summary_large_image`). Constantes em `app/_lib/site.ts`.
- `app/opengraph-image.png` e `app/twitter-image.png` (iguais, 1200×630, 141 KB): `logo-card.jpg` centralizado em 560px sobre #15161A, sem a ✦. PNG com paleta: o PNG cheio dava 455 KB, acima do limite de ~300 KB do WhatsApp. Gerado com sharp fora do projeto. Alt em `*.alt.txt`.
- `app/robots.ts` (bloqueia `/adm`, `/perfil`, `/bookings`, `/api`) e `app/sitemap.ts` (home, `/privacidade` e `/barbershop/[id]` das barbearias visíveis, lidas do banco a cada pedido).
- JSON-LD `HairSalon` na home (`app/_lib/json-ld.ts`): nome, url, imagem og, telefone, endereço e sex/sáb 09:00–20:30.
- Teste: `e2e/seo.spec.ts` (tags og/twitter, imagem 1200×630 servida, modelo de título, JSON-LD, robots, sitemap).

**Decisões:**
- Título da aba `Cris du Corte`; título da prévia (og e twitter) `Cris du Corte — Agende seu horário`, como na spec §4.8 (decisão do dono).
- Endereço e telefone fixos no JSON-LD; o endereço do banco não foi lido nem alterado.
- Sitemap com `force-dynamic`: o build não consulta o banco.
- `og:url` não definido no layout para não apontar todas as páginas para a home.
- Sem feature flag: só metadados e tamanho de imagem, nada muda na tela.
- `manifest.ts` e `.ics` (resto da §4.8) ficam para depois.
- Agenda, marca, cores do Prompt 8 e banco não foram tocados.

**Imagens da home (`next build` + `next start`, deslogado, bytes recebidos):**

| Perfil | Total | Arquivo |
|---|---|---|
| Celular 390px DPR 3 | 49,2 KB | `logo-card.jpg` → webp w=1080 |
| Desktop 1440px DPR 1 | 23,5 KB | `logo-card.jpg` → webp w=384 |

Medido com o otimizador local do Next (sem `sharp` instalado); na Vercel os bytes podem variar um pouco.

**JSON-LD:** validator.schema.org → HairSalon, PostalAddress e OpeningHoursSpecification reconhecidos, 0 erros e 0 avisos.

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 60 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 15 ✅. Depois da correção do número do endereço (2255): lint ✅, build ✅, e2e 15 ✅. Numa execução intermediária, os 2 testes de reserva de `fluxos.spec.ts` falharam uma vez e passaram isolados e na suíte seguinte (instável, sem relação com este prompt).

**Produção (2026-10-16) ✅:** PR #9 mergeado na `main` (`e42e98c`) e publicado pela Vercel. Prévia no WhatsApp validada pelo dono no site real.

**Banco de produção (2026-10-16):** endereço da barbearia corrigido à mão pelo dono para "Ns de Fátima, 2255" (mesmo número do JSON-LD).

**Pendências:**
- [x] Depois do deploy: dono testa a prévia no WhatsApp — validada em 2026-10-16.
- [ ] Opcional: Google Rich Results Test na URL de produção.

## Prompt 10 · Tokens, fontes e escala

**Feito:**
- `app/globals.css`: variáveis da spec §2 em `:root` (antes em `.dark`). Novas: `--surface-2`, `--disabled`, `--warning`, `--radius-sm/lg/xl`, vidro, brilho, sombras, `--ease-out` e `--dur-*`; bloco `prefers-reduced-motion` e fallback `.glass`. Cores do Prompt 8 (primary, accent, accent-soft, secondary, muted, ring) mantidas.
- Fundo, card, texto e borda passam para a spec: #15161A, #1A1C21, #F4F4F5 e #2E3038 (a borda era #26272B).
- HSL × HEX conferido: 7 valores da spec com números inteiros davam outra cor (background, card, primary, accent, accent-soft, warning, destructive). Corrigidos com uma casa decimal no CSS e na spec.
- `tailwind.config.ts`: `font-sans` (Space Grotesk), escala `caption/label/body/title/display`, cores `surface2`, `disabled`, `warning`, `shadow-glow`, `shadow-selected`, `spacing.tap` (44px), `spacing.page` (20px) e `ease-out`.
- `app/layout.tsx`: Inter → Space Grotesk via `next/font` (`--font-space-grotesk`); Permanent Marker igual.
- Escala aplicada em todas as telas e nas primitivas `ui/`: `text-xs` → `caption`; `text-sm` → `body` (14 → 15px); títulos de seção em caixa alta → `label`; `text-lg` e `text-xl` → `title` (h1 20 → 18px); `text-2xl` → `display` (24 → 26px). Exceção: a marca no header (`font-brand text-lg`).
- `px-5` (margem lateral da página e dos sheets) → `px-page`; `pl-5` dos títulos da home → `pl-page`. Mesmos 20px.
- `app/_lib/utils.ts`: `cn` usa `extendTailwindMerge` com a escala e o espaçamento novos. Sem isso, o `tailwind-merge` tratava `text-body` como cor e o descartava ao lado de `text-muted-foreground`. Teste em `utils.test.ts`.

**Decisões:**
- **Sem feature flag (decisão do dono, 2026-10-16):** fonte, escala e todas as cores da spec valem para todos.
- Raio fica para o prompt de componentes (decisão do dono): variáveis novas criadas, mas `--radius` continua 0.5rem e o mapeamento `rounded-*` do Tailwind não mudou.
- `px-page` é token de espaçamento, não componente: o container `max-w-md`/`max-w-3xl` da spec muda o layout e fica para depois.
- Layout, componentes, agenda (`schedule.ts`, `AGENDA_V2`), banco e marca não foram tocados.

**Conferência em 390px (Playwright, `next start`, banco Neon "Testes"):** home, menu lateral, barbearia, sheet de reserva (chips de horário e resumo), `/bookings`, sheet do card de agendamento, `/adm` e sheet do admin. Nenhum elemento passa da largura da tela nem tem texto cortado. Os chips de horário continuam numa linha com rolagem lateral, como antes.

**Lighthouse acessibilidade (local, `next start`, banco Neon "Testes", cliente logado por cookie):**

| Página | Celular | Desktop |
|---|---|---|
| Home | 100 | 100 |
| Barbearia | 100 | 100 |
| `/bookings` | 100 | 100 |

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 63 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 15 ✅.

**Teste de aceite (localhost) ✅:** aprovado pelo dono em 2026-10-16.

**Pendências:**
- [ ] Prompt de componentes: raio da spec (`rounded-lg` 16px etc.) e container `max-w-md`/`max-w-3xl`.
- [ ] Título "Detalhes do Agendamento" do sheet do admin fica encostado no X em 390px (não sobrepõe); revisar no prompt de componentes.

## Prompt 11 · Vidro, brilho e luz ambiente

**Feito:**
- `app/globals.css`: classes `.glass` (fundo `--glass-bg`, borda `--glass-border`), `.glass-blur` (`backdrop-filter: blur(12px)`), `.glow-card` (borda `--glow-border` + `--shadow-glow`) e `.ambient-glow` (radial roxo). Usam os tokens do Prompt 10, nenhum novo. Ficam fora de `@layer` para vencer `bg-card`/`border` do `<Card>`; `hover:` continua ganhando.
- Versão leve: sem suporte a `backdrop-filter` → `.glass-blur` usa fundo sólido `--card`. `prefers-reduced-transparency` → vidro sólido, sem blur, sem brilho. `prefers-reduced-motion` → sem brilho (luz ambiente some, `.glow-card` sem sombra).
- `app/_components/ambient-glow.tsx`: círculo radial no canto superior direito do header, `aria-hidden`, `pointer-events-none`, `-z-10`; entra com fade de 300ms.
- Aplicado em: header (`glass` + blur + luz ambiente), card da barbearia na home (`glass glow-card`), card de serviço da barbearia e card de agendamento (`glass`). `ui/card.tsx`, sheets, admin e cards sobre foto não mudaram.
- Blur só no header: nos cards o fundo atrás é liso, o blur não mudava nada e custava pintura.
- Header liga a luz ambiente e o blur só depois do `load` (`useAfterLoad` em `header.tsx`), com fade de 300ms.
- Ícones recomprimidos com `sharp` (PNG com paleta, mesma imagem, mesmo tamanho em pixels, fundo #15161A exato): `app/icon.png` 512×512 de 294.049 → 39.986 bytes; `app/apple-icon.png` 180×180 de 43.434 → 6.951 bytes. Conferidos lado a lado em 32px e 180px, sem diferença visível.

**Decisões:**
- **Sem feature flag (decisão do dono, 2026-10-16)**, como no Prompt 10.
- **Efeitos depois do load (decisão do dono, 2026-10-16):** a luz ambiente e o blur atrasavam a primeira pintura uns 100ms. O Lighthouse (simulação "lantern") inclui no cálculo do LCP toda requisição que começou antes da pintura observada; com o atraso, o `icon.png` (294 KB, prioridade alta) passava a começar antes e somava ~1,4s ao LCP simulado de home e `/bookings`. Correlação de 100% nas 30 rodadas.

**Elemento LCP (igual antes e depois):** home = imagem do card da barbearia; barbearia = foto do topo; `/bookings` = nome da marca no header (`font-brand`).

**Lighthouse mobile (local, `next start`, banco Neon "Testes", cliente logado por cookie; antes e depois lado a lado, rodadas intercaladas, mediana de 5):**

| Página | LCP antes | LCP depois | Diferença | Acessibilidade antes → depois |
|---|---|---|---|---|
| Home | 2,93s | 3,00s | +0,07s | 100 → 100 |
| Barbearia | 2,85s | 2,88s | +0,03s | 100 → 100 |
| `/bookings` | 2,65s | 2,67s | +0,02s | 100 → 100 |

Local fica acima de 2,5s nas duas versões porque o servidor local consulta o Neon pela internet (TTFB 1,1–2,5s). O limite de 2,5s é conferido em produção depois do merge.

**Conferência em 390px (Playwright):** home, barbearia e `/bookings` sem rolagem lateral; `prefers-reduced-motion` confirmado por estilo computado (luz ambiente `display: none`, card sem sombra).

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 63 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 15 ✅.

**Teste de aceite (localhost) ✅:** aprovado pelo dono em 2026-10-16.

**Produção (2026-10-16) ✅:** PR #11 mergeado na `main` (`b5f8b70`) e publicado pela Vercel.

**PageSpeed Insights em produção (celular, home, deslogado, medido pelo dono):** Desempenho 97 · Acessibilidade 98 · Práticas recomendadas 100 · SEO 100. A acessibilidade 98 é investigada no Prompt 12.

**Pendências:**
- [x] Depois do merge: Lighthouse mobile em produção — feito pelo PageSpeed (acima).


## Prompt 12 · Estados (vazio, erro, carregando) (MEL-012)

**Feito:**
- `app/_components/`: `empty-state.tsx` (ícone + título + texto + ação), `error-state.tsx` (borda destructive 40% + "Tentar de novo", `role="alert"`), `skeleton.tsx` (surface-2, pulso de 1,5s, parado com reduzir movimento). Apoio: `route-error.tsx` (conteúdo dos `error.tsx`: `router.refresh()` + `reset()`) e `bookings-skeleton.tsx`.
- `loading.tsx` e `error.tsx` em `/` (`app/(home)`), `/bookings` e `/adm`. Esqueletos com `min-h-screen` para o rodapé não pular quando o conteúdo chega (sem isso o CLS da home ia a 0,3).
- Erros da reserva (`app/_lib/booking-errors.ts`, spec §4.2): `saveBooking` devolve `code` + mensagem. P2002 e horário achado na consulta → "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." + grade recarregada (reservas do dia + `router.refresh()`); sem internet ou fetch que caiu → "Sem conexão. Verifique a internet e tente de novo."; rate limit → "Muitas tentativas seguidas. Aguarde 1 minuto."; resto → "Não conseguimos reservar agora. Tente de novo em instantes."
- Estados vazios: `/bookings` "Você ainda não tem horários marcados." + [Agendar agora]; `/adm` "Nenhum agendamento por enquanto."; home sem barbearia "Nenhuma barbearia disponível agora." (seção Agendamentos continua sumindo quando vazia, como o NextBookingCard da spec); painel de reserva com o dia lotado: "Todos os horários de sábado já foram reservados." + "Que tal sexta?" [Ver sexta] (e o inverso), só se o outro dia estiver liberado.
- "Reservar" decide o login pela sessão do servidor (`isAuthenticated`), não pelo `useSession` ainda carregando: antes, um toque rápido mandava um cliente logado para o Google.
- Acessibilidade em produção 98: o PageSpeed usa o Lighthouse 13.5, que reprova `landmark-one-main` (o 12.8 usado até aqui não). `app/layout.tsx` passa a envolver as páginas em `<main>`; o `<main>` interno de `/privacidade` virou `<div>`.

**E2e instável — causa:**
- No CI os 15 testes nunca falharam (sem retry nos últimos 10 runs, ~10s). Localmente a suíte leva ~1 min porque o servidor fala com o Neon "Testes" (us-east-2) pela internet: a 1ª confirmação de reserva levou ~2,9s e as seguintes ~1,4s, contra os 5s do `expect`. Somado à oscilação da rede, passava do limite. A dependência entre testes fazia uma falha virar duas (o teste do admin só via a reserva criada pelo teste anterior).
- Um `npm run dev` aberto grava na mesma `.next` do `next start` do e2e e corrompe o build (`Cannot find module './vendor-chunks/@swc.js'`). Rodar e2e com o dev server parado.
- Correções (sem aumentar timeout): `globalSetup` aquece o servidor (carrega as rotas e abre a conexão do Prisma) antes do 1º teste; os testes esperam a resposta da server action (`waitForServerActions`) e a sessão carregada (`gotoLoggedIn`) antes de afirmar; cada teste usa os próprios dados (`e2e/db.ts`: cliente C, reserva passada para o admin, `freeSlot` antes de reservar); o teste de 390px usa 19:30, que ninguém reserva; `AGENDA_V2=off` fixo no e2e (o `next start` lia o `.env` local).
- Testes novos: dois clientes no mesmo horário (o segundo vê a mensagem do P2002 e o horário some), `/bookings` vazio, sábado lotado sugere a sexta; unit `booking-errors.test.ts` e P2002/genérico em `save-booking.test.ts`.

**Decisões:**
- **Sem feature flag (decisão do dono, 2026-10-16).**
- Texto do `/adm` vazio aprovado pelo dono: "Nenhum agendamento por enquanto."
- Carregando e erro conferidos na tela com um `next start` apontado para um banco inalcançável: esqueleto da home, de `/bookings` e de `/adm`, depois o ErrorState da home. O erro de `/bookings` e `/adm` não aparece assim (sem banco a sessão some e a rota redireciona para a home); usa o mesmo componente.
- Agenda (`schedule.ts`, `AGENDA_V2`), marca, banco e o visual do Prompt 11 não foram tocados.

**Lighthouse 13.5 (local, `next start`, banco Neon "Testes", celular):** acessibilidade 100 em home deslogada, home logada, barbearia, `/bookings` e `/privacidade`. Home, desempenho com e sem `loading.tsx` (4 rodadas intercaladas): 84–85 × 84, CLS 0 × 0. LCP local ~4,4s nas duas versões (banco em us-east-2); conferir em produção depois do merge.

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 68 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 18 ✅ em 5 rodadas seguidas (5/5).

**Teste de aceite (localhost) ✅:** aprovado pelo dono em 2026-10-16.

**Pendências:**
- [ ] Depois do merge: PageSpeed em produção (acessibilidade 100 esperada).


## Prompt 13 · Menu lateral acessível (MEL-011)

**Feito:**
- `app/_components/side-menu.tsx`: itens Início · Meus agendamentos (logado) · Perfil (logado) · Admin (só `session.user.isAdmin`) · Privacidade · Sair (logado) / Fazer login (deslogado), com o aviso "Ao entrar, você concorda com a Política de Privacidade." logo abaixo do Fazer login. Itens dentro de `<nav aria-label="Menu principal">`; o item da página atual tem `aria-current="page"` (via `usePathname`) e borda accent + texto `accent-soft`. "Sair" virou um `<button>` real com texto (antes era só ícone ao lado do avatar). Os links fecham o menu (`SheetClose`), inclusive quando o item é a página atual.
- Admin passa a ver "Meus agendamentos" (`/bookings`, as próprias reservas) além de "Admin" (`/adm`). Removida a troca de rótulo e rota pelo `isAdmin` ("Agendamentos" × "Agendamentos dos clientes"). Não havia mais checagem por e-mail no código.
- Foco preso, Esc fechando e foco voltando ao botão "Abrir menu" vêm do Sheet (Radix Dialog); agora cobertos por e2e. `header.tsx`: só `aria-describedby={undefined}` no `SheetContent` (tira o aviso do Radix sobre descrição); visual igual.
- Contraste dos botões vermelhos sólidos (pedido do dono): token novo `--destructive-solid` #DC2626 (branco 4,83:1; o #EF4444 dava 3,76:1) em `globals.css` + `destructive.solid` no `tailwind.config.ts`; usado no variant `destructive` do `Button` (vale para o "Excluir" do `AlertDialogAction`, os "Cancelar reserva" e o "Excluir minha conta") e na classe do "Excluir" em `delete-account-button.tsx`. O `--destructive` #EF4444 continua em textos e bordas sobre fundo escuro (ErrorState, mensagens do formulário): 4,80:1 no fundo, contra 3,74:1 se fosse o #DC2626.
- E2e novo `e2e/menu.spec.ts`, só com teclado (Tab, Shift+Tab, Enter, Esc): deslogado (itens, Fazer login + aviso, sem Admin/Sair, foco preso nas duas direções, Esc devolve o foco), cliente (itens, Enter em "Meus agendamentos" abre `/bookings` com `aria-current`), admin (Admin + própria reserva em `/bookings`, Enter em Admin abre `/adm`) e Sair (é `<button>`, Enter desloga). O teste do admin cria e apaga a própria reserva (o `estados.spec` usa o admin sem reservas); o do Sair recria a sessão dele a cada execução (o `signOut` apaga a sessão no banco).

**Decisões:**
- **Sem feature flag (decisão do dono, 2026-10-16).**
- Home não alterada: o admin continua vendo na home as reservas de todos.
- Agenda, home, banco, marca e o visual dos Prompts 8, 10 e 11 não foram tocados.

**Lighthouse 13.5 (local, `next start`, banco Neon "Testes", celular, acessibilidade):** 100 em home deslogada, home logada, barbearia, `/bookings` (cliente e admin), `/adm` e `/privacidade`. `/perfil` 100 em 3 rodadas (antes 96 pelo contraste do "Excluir minha conta", corrigido acima). AlertDialog "Excluir sua conta?" aberto: axe-core 4.14 sem violações, botões com fundo `rgb(220, 38, 38)` e texto branco. Menu aberto (o Lighthouse não abre o menu): axe-core 4.14 (o do Lighthouse 13.5), deslogado, cliente e admin, sem violações.

**Validação (local, 2026-10-16):** `npm run lint` ✅ · `npm run test:unit` 68 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 22 ✅ em 5 rodadas seguidas (5/5), também depois da correção do contraste · `e2e/menu.spec.ts` com `--repeat-each 5` 20/20 ✅.

**Teste de aceite (localhost) ✅:** aprovado pelo dono em 2026-10-16.

**Produção ✅:** PR #13 mergeado na `main` (`5b9a581`) e publicado pela Vercel.

**Pendências:**
- [ ] Depois do merge: PageSpeed em produção.

## Prompt 14 · Home nova (MEL-008, 001, 003, 007)

**Feito:**
- Flag `NEW_HOME` (`off | admin | all`) no `isEnabled` existente (`isNewHomeEnabled` em `app/_lib/flags.ts`). Sem `NEW_THEME`: o visual já estava aplicado.
- `app/(home)/page.tsx` escolhe a home: flag ligada para a sessão → `NewHome`; desligada → `ClassicHome` (conteúdo antigo movido sem alteração para `app/(home)/_components/classic-home.tsx`). JSON-LD continua na `/` nas duas.
- `/classic` (`app/classic/page.tsx`): home antiga para quem tem a flag ligada; para os outros redireciona para `/` (que já é a antiga). `noindex` e `Disallow: /classic` no `robots.txt`.
- Home nova (ordem da spec §4.1 e da tela ✔ Escolhida): saudação ("Olá, [primeiro nome]!" / "Olá, vamos agendar um corte?") + "Atendimento às sextas e sábados"; `ShopCard` horizontal (`logo-card.jpg` 72px, nome e endereço do banco, selo "Sex e Sáb"); `DayChip` com "N horários livres" / "Lotado" (`aria-pressed`, abre no primeiro dia com horário livre); `TimeSlot` em grade de 4 colunas (ocupado riscado, tracejado, `disabled`, `aria-label="10:30, ocupado"`); `BookingCTA` ("Escolha um horário" → "Reservar Sex 16 às 09:00 →", "Reservando…"); `NextBookingCard` só com a próxima reserva **futura** do próprio cliente (resolve a pendência do Prompt 8). Componentes em `app/_components/` (`shop-card`, `day-chip`, `time-slot`, `booking-cta`, `next-booking-card`); composição em `app/(home)/_components/` (`new-home`, `booking-picker`).
- Sem busca e sem Recomendados/Populares na home nova. Domingo (sem dias): `AGENDA_CLOSED_MESSAGE`. Dia lotado: "Todos os horários de sábado já foram reservados." + [Ver sexta].
- Serviço (spec §4.1): com mais de 1 serviço, o CTA abre o Sheet "Confirmar reserva" com os serviços em `radiogroup` (primeiro por `id` já marcado: "Corte de Cabelo" em produção/Neon) e o resumo (dia, horário, barbearia, valor); com 1 serviço, confirma direto. Reserva em 3 toques: horário → CTA → Confirmar.
- Deslogado: o CTA chama `signIn("google")` normal. Voltar com a seleção (MEL-009) fica para o Prompt 15.
- Admin: seção "Reservas da semana (admin)" com todas as reservas futuras até o fim do último dia liberado (carrossel do `BookingItem`, como na home antiga) + link "Ver agenda completa" → `/adm`.
- Dias, horários e reservas calculados só no servidor (`getNextServiceDays` + `buildDaySlots` em `schedule.ts`, comparação no fuso de São Paulo).
- `saveBooking`: a validação do Prompt 6 (`isBookableSlot`) vale quando `AGENDA_V2` **ou** `NEW_HOME` está ligada para o usuário. Mensagens do Prompt 12 reaproveitadas (`BOOKING_ERROR_MESSAGES`, `shouldReloadSlots` → `router.refresh()`). Sucesso: "Reservado! Sex 16 às 10:30." (spec §4.2) + [Visualizar].
- Relógio do servidor no e2e: `getNow()` em `schedule.ts` só lê `SCHEDULE_NOW` com `E2E=1` **e** sem `VERCEL`; em qualquer outro caso `new Date()`. Usado pela home nova e pelo `saveBooking`. Teste unitário garante que com `VERCEL` definido o `SCHEDULE_NOW` é ignorado.
- `/barbershop/[id]` sem alteração. Banco sem migração.
- Ajuste pedido após o teste na staging: no computador, o conteúdo da home nova fica numa coluna centralizada (`mx-auto max-w-lg`, 512px); header e rodapé continuam largos. No celular nada muda (390px: CTA com 350px, sem rolagem horizontal).

**Decisões:**
- Serviço no Sheet (spec §4.1), seção do admin + link para `/adm`, relógio com trava dupla e MEL-009 adiado: aprovados pelo dono em 2026-10-17.
- Com `NEW_HOME` ligada para o admin, uma reserva dele pela `/barbershop/[id]` também passa pela regra do Prompt 6 (efeito de validar por `NEW_HOME` no `saveBooking`).
- e2e com `NEW_HOME=admin`, `E2E=1` e `SCHEDULE_NOW` = a mesma quarta futura do `page.clock`. Segundo serviço só do e2e ("Barba", `e2e/db.ts`) para cobrir o Sheet. O aviso de domingo fica coberto por unit (o relógio do servidor é um só por rodada).

**Lighthouse 13.5 (local, `next start`, banco Neon "Testes", celular, acessibilidade):** 100 em home nova (admin, `NEW_HOME=admin`), `/classic` (admin), home antiga (cliente), home nova deslogada e de cliente (`NEW_HOME=all`). Sheet "Confirmar reserva" aberto: axe-core 4.14 sem violações. 390px sem rolagem horizontal.

**Validação (local, 2026-10-17):** `npm run lint` ✅ · `npm run test:unit` 78 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 25 ✅ em 2 rodadas seguidas.

**Staging:** `fase2/home-nova` enviado para `staging` (Preview com `NEW_HOME=all`); fluxo aprovado pelo dono no celular em 2026-10-17. Reenviado com a coluna centralizada (lint ✅ · e2e 25 ✅).

**Teste de aceite (staging) ✅:** aprovado pelo dono em 2026-10-17, no celular e no computador.

**Pendências:**
- [x] Vercel Production: `NEW_HOME` e `AGENDA_V2` em `all` desde 2026-10-17, a pedido do Cris (antes dos 7 dias da spec §6). `/classic` fica por 30 dias.
- [x] Prompt 15: voltar com a seleção depois do login (MEL-009) — feito no Prompt 15.

**Produção (2026-10-17) ✅:** PR #14 mergeado na `main` (`38a1ec9`) e publicado pela Vercel. No mesmo dia, `NEW_HOME` e `AGENDA_V2` foram para `all` em Production, a pedido do Cris. `staging` atualizada para ficar igual à `main`.

## Prompt 15 · Voltar com a seleção após o login (MEL-009)

**Feito:**
- `app/_lib/booking-resume.ts`: `saveBookingResume` / `takeBookingResume` (lê e apaga) em `sessionStorage`, chave `crisducorte:booking-resume`, formato `{serviceId, date, time}` validado. Tudo em try/catch: sem storage (aba anônima, bloqueado) não faz nada e o fluxo segue como antes.
- Home nova, deslogado: o toque no BookingCTA salva a seleção, registra `login_from_booking` (evento já existente) e chama `signIn("google", { callbackUrl: "/?resume=1" })`.
- Volta com `?resume=1`: retoma a seleção se o dia ainda está na grade do servidor (que já segue a regra da agenda) e o horário está livre. Com mais de 1 serviço abre o Sheet "Confirmar reserva" com o serviço marcado; com 1 serviço deixa o CTA pronto. Nunca confirma sozinho. Horário ocupado ou fora da regra: toast "Esse horário não está mais disponível. Escolha outro." e a grade do dia salvo. Nos dois casos o storage é apagado e o `?resume=1` sai da URL (`router.replace("/")`). O `saveBooking` continua validando no servidor.
- Sem banco, sem mudança na regra da agenda e sem visual novo (aviso no toast existente). Só aparece com `NEW_HOME` ligada.
- e2e com `NEW_HOME=all` (igual à produção); o teste "cliente comum continua vendo a home antiga" virou "cliente comum vê a home nova e a antiga em /classic".
- Testes: `booking-resume.test.ts` (unit) e `e2e/login-resume.spec.ts` — o login do Google é simulado interceptando o `POST /api/auth/signin/google` (confere o `callbackUrl`, cria o cookie de sessão e devolve `/?resume=1`). Casos: volta com o mesmo dia e horário e confirma; horário ocupado por outro cliente durante o login; `sessionStorage` bloqueado sem erro.

**Decisões (aprovadas pelo dono em 2026-10-17):**
- e2e com `NEW_HOME=all`.
- Mais de 1 serviço: Sheet aberto com o serviço marcado; 1 serviço: CTA pronto; nunca confirma sozinho.

**Validação (local, 2026-10-17):** `npm run lint` ✅ · `npm run test:unit` 83 ✅ · `npm run test:int` 14 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 28 ✅ em 2 rodadas seguidas.

**Staging:** `fase2/login-resume` enviado para `staging` (`NEW_HOME=all`) para teste no celular.

**Teste de aceite (staging) ✅:** aprovado pelo dono em 2026-10-17, no celular, com login real do Google: voltou com o horário selecionado e a reserva foi confirmada.

**Produção (2026-10-17) ✅:** PR #15 mergeado na `main` (`5f6f3df`) e publicado pela Vercel. `staging` atualizada para ficar igual à `main`.

## Prompt 16 · Schema da Fase 3 + disponibilidade (MEL-019, MEL-025)

**Feito:**
- `schema.prisma` (spec §5): enum `BookingSource` (CLIENT, MANUAL, MENSALISTA); em `Booking`, `customerName`, `customerPhone`, `mensalistaId`, `cycleId` (opcionais) e `source` (padrão CLIENT); modelos `SlotBlock`, `Mensalista`, `MensalistaCycle`, enum `MensalistaStatus` e `BookingCancellation` (`bookingId`, `date`, `cancelledAt`, `byAdmin`, `source`).
- Migração `20261017000000_fase3_schema`, só aditiva: 2 enums, 5 colunas novas em `Booking`, 4 tabelas, 2 índices (`BookingCancellation_date_idx`, `SlotBlock_date_key`) e 3 chaves estrangeiras. Nenhum DROP, RENAME, ALTER TYPE ou UPDATE. Gerada com `prisma migrate diff` entre o schema antigo e o novo (sem banco), SQL aprovado pelo dono antes de aplicar.
- `app/_lib/availability.ts` (ponto único, spec §5): `isSlotAvailable(data, hora, { barbershopId })`, `getSlotStatus` (AVAILABLE, TAKEN, BLOCKED, OUTSIDE_SCHEDULE) e `getDaySlots(data, { barbershopId })`. Consideram `TIME_GRID`, a regra da agenda (`getNextServiceDays`), `Booking` da barbearia e `SlotBlock`. Aceitam o `tx` da transação.
- Home nova usa `getDaySlots`. `saveBooking` usa `getSlotStatus` dentro da transação (flags ligadas) ou `getInstantStatus` (só reserva e bloqueio no instante exato, com as flags desligadas, como a agenda antiga). Mensagens iguais: ocupado → SLOT_TAKEN; fora da regra ou bloqueado → SLOT_UNAVAILABLE. O `@@unique` (P2002) continua como última trava.
- Nome do cliente (`app/_lib/customer-name.ts`): `customerName ?? user.name`; conta sem nome continua "Cliente"; "Conta excluída" só sem conta e sem `customerName`. Usado em `booking-info.tsx` e `booking-item-adm.tsx` (inicial do avatar também).
- `cancelBooking` continua apagando a reserva e grava 1 linha em `BookingCancellation` na mesma transação. `byAdmin` só quando o admin cancela a reserva de outra pessoa.
- `getBookingMetrics` conta as canceladas (`canceladas` no total e por semana), pela data do horário cancelado. Cancelamentos anteriores a esta versão não têm registro.
- `prisma/sql/fase3-schema-producao.sql`: o mesmo SQL da migração dentro de `BEGIN`/`COMMIT` (com `lock_timeout` de 5s), mais as consultas de antes e de conferência (só leitura) e o lembrete do `migrate resolve`. Consultas de conferência testadas no Neon dev.
- Testes: unit `availability.test.ts`, `customer-name.test.ts`, `metrics.test.ts`, `cancel-booking.test.ts` e `save-booking.test.ts` (bloqueio e horário com segundos); integração `tests/integration/cancellation.int.test.ts` (linha gravada, `byAdmin`, `source` preservado, recusa não grava, dois cancelamentos simultâneos geram 1 linha, métrica) e caso de `SlotBlock` em `agenda-v2.int.test.ts`. `resetDatabase` limpa as tabelas novas.

**Decisões (aprovadas pelo dono em 2026-10-17):**
- Funções de disponibilidade recebem `barbershopId` (a reserva é única por barbearia e data); o bloqueio vale para o horário em todas as barbearias.
- `byAdmin` só quando o admin cancela a reserva de outra pessoa.
- "Conta excluída" só com `userId` nulo e sem `customerName`; conta sem nome continua "Cliente".
- `/barbershop/[id]` sem mudança agora (continua com `getDayBookings`).
- Índice `Booking_barbershopId_date_key` e tabela `Booking_backup_duplicates` de produção não foram tocados.
- `isBookableSlot` e `buildDaySlots` (`schedule.ts`) ficaram sem uso no app, só nos testes; podem sair num prompt de limpeza.

**Banco:**
- Neon dev: o histórico não tinha a migração do Prompt 5 (`userId` ainda `NOT NULL`); o `migrate deploy` aplicou as duas em ordem. Reservas antes: 3; depois: 3, mesmo hash (id, barbearia, serviço, usuário, data), todas com `source = CLIENT`.
- Neon "Testes": aplicada pelo setup da integração (`migrate deploy`).
- Produção (Supabase): Prompt 16 — schema aplicado em produção em 2026-10-17 (backup prod-2026-10-17.dump). SQL de `prisma/sql/fase3-schema-producao.sql` aplicado à mão pelo dono no SQL Editor e conferido (contagem e hash de `Booking` iguais, 4 tabelas novas vazias). Registrada no histórico com `npx prisma migrate resolve --applied 20261017000000_fase3_schema`; `migrate status` → "4 migrations found" e "Database schema is up to date!".

**Validação (local, 2026-10-17):** `npm run lint` ✅ · `npm run test:unit` 105 ✅ · `npm run test:int` 21 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 28 ✅.

**Staging:** `fase3/schema` enviado para `staging` (banco Neon dev, já migrado).

**Teste de aceite (staging) ✅:** aprovado pelo dono em 2026-10-19: reserva, cancelamento, horário liberado de volta e linha gravada em `BookingCancellation` (Sex 23 às 09:00, `byAdmin` false, `source` CLIENT).

**Pendências:**
- [x] Produção: dono aplica o SQL no Supabase (backup antes) **antes do merge** — o código novo lê `SlotBlock` e grava `BookingCancellation`; sem a migração, reservar e cancelar quebram em produção. Feito em 2026-10-17 (backup prod-2026-10-17.dump).
- [x] Produção: `npx prisma migrate resolve --applied 20261017000000_fase3_schema` e `migrate status` — feito em 2026-10-17, "Database schema is up to date!".
- [x] Prompt 17: `/barbershop/[id]` deve esconder os horários bloqueados (`SlotBlock`), usando `availability.ts` — feito no Prompt 17.
- [x] Prompt 17 (painel do admin): exibir métricas no /adm, incluindo canceladas (getBookingMetrics) — feito no Prompt 17 (aparecem com a flag ligada ou desligada).
- [ ] Pendência do Prompt 3 (12 pares de reservas no mesmo horário antes de um `@@unique` só por data) continua aberta.

## Prompt 17 · Painel do admin: bloqueios, reserva manual e métricas (MEL-019)

**Feito:**
- Flag `ADMIN_PANEL_V2` (`off | admin | all`, padrão `off`; `isAdminPanelV2Enabled` em `app/_lib/flags.ts`). Ligada: o `/adm` mostra a grade da semana aberta no topo, depois as métricas e a lista antiga (Confirmados/Finalizados). Desligada: a lista antiga + as métricas.
- Grade (`app/_lib/admin-agenda.ts` + `app/adm/_components/`): os dias de `getNextServiceDays` (sexta e sábado da semana aberta; domingo mostra `AGENDA_CLOSED_MESSAGE`), os 11 horários de cada dia com o estado: Livre (Reservar na mão · Bloquear), reservado (nome via `customer-name.ts`, serviço, selo "Reserva na mão", telefone completo como link `https://wa.me/55<dígitos>` com `aria-label="Chamar <nome> no WhatsApp"`; Cancelar com AlertDialog), Bloqueado + motivo (Desbloquear). Horário que já passou aparece sem ações. Relógio `getNow()`.
- "Bloquear dia inteiro" (Sheet com motivo opcional): numa transação só, trava cada horário (`lockSlot`, em ordem) e bloqueia os livres e futuros do dia; reservas não são tocadas. Toast: "X horários bloqueados, Y reservas mantidas (cancele à parte se precisar)." (sem o parêntese quando Y = 0). "Desbloquear dia" remove os bloqueios do dia.
- Server Actions em `app/_actions/admin/`: `blockSlot`, `unblockSlot`, `blockDay`, `unblockDay`, `createManualBooking`, `adminCancelBooking`. Todas conferem `isAdmin` pela sessão no servidor (`assertAdmin`) antes de tocar no banco, validam a entrada com zod e devolvem `{ success, message | code + error }` (peças comuns em `app/_lib/admin-actions.ts`). A barbearia é resolvida no servidor (a mesma da home nova).
- Reserva manual: nome (1–80) + WhatsApp (10 ou 11 dígitos, aceita máscara e +55; grava só os dígitos, `app/_lib/phone.ts`) + serviço da barbearia; `source = MANUAL`, `userId = null`. Recusa horário reservado, bloqueado ou fora da semana aberta (`getSlotStatus` na transação); P2002 vira "já tem reserva".
- Cancelamento pelo painel: apaga a reserva e grava `BookingCancellation` com `byAdmin = true` sempre e o `source` original, na mesma transação. O `cancelBooking` do cliente continua com a regra do Prompt 16.
- Métricas (`booking-metrics.tsx`): `getBookingMetrics` da semana atual + 4 anteriores (`recentWeeksWindow`), total de confirmadas e canceladas e tabela por semana (semanas sem reserva aparecem com 0), com a nota "Canceladas registradas desde 19/10/2026."
- Trava por horário (`app/_lib/slot-lock.ts`): `pg_advisory_xact_lock(hashtextextended('slot:<barbershopId>:<instante ISO UTC>', 0))` dentro da transação, igual em `saveBooking`, `createManualBooking`, `blockSlot` e `blockDay`. Sem ela, bloquear e reservar o mesmo horário ao mesmo tempo gravava os dois (SlotBlock e Booking são tabelas diferentes) — conferido: com a trava desligada o teste de integração falha.
- `/barbershop/[id]`: `getDayBookings` passa a usar `getTakenInstants` (`availability.ts`, reservas + bloqueios) e devolve **só as datas**. Antes devolvia o `Booking` inteiro (userId, `customerName`, `customerPhone`) para qualquer visitante. `getDaySlots` usa o mesmo `getTakenInstants`.
- Ajuste pedido após o teste no localhost: no computador, o `/adm` fica numa coluna centralizada (`mx-auto max-w-2xl`, 672px), coerente com a home nova; header largo. Cada linha da grade: hora + estado + botões; no celular os botões ficam abaixo, a partir de `sm` na mesma linha, à direita.
- Sem migração.

**Teste de aceite (localhost) ✅:** aprovado pelo dono em 2026-10-19 (bloquear/desbloquear, reserva manual, WhatsApp, cancelamento pelo admin, bloquear/desbloquear dia mantendo a reserva).

**Decisões (aprovadas pelo dono em 2026-10-19):**
- Flag `ADMIN_PANEL_V2`, padrão `off`.
- Grade só da semana aberta, respeitando `getSlotStatus` (spec §4.4 falava em 4 semanas).
- `byAdmin = true` sempre que o cancelamento vem do painel.
- "Bloquear dia inteiro" incluído; mensalistas, AdminTabs e métrica por `source` ficam para o Prompt 18.
- Chave da trava: barbearia + instante em UTC. O bloqueio vale para todas as barbearias (Prompt 16), mas a trava é por barbearia: com mais de uma barbearia, um bloqueio e uma reserva noutra barbearia não se excluem (hoje só há uma visível).

**Testes:**
- Unit: `app/_actions/admin/admin-actions.test.ts` (isAdmin em todas as actions, validação, recusas, `blockDay` só livres e futuros e travas em ordem, reserva manual, `byAdmin`), `admin-agenda.test.ts`, `phone.test.ts` (inclui `slotLockKey`), `get-day-bookings.test.ts` (só datas), `availability.test.ts` (`getTakenInstants`), `metrics.test.ts` (`recentWeeksWindow`), `flags.test.ts`, `adm/page.test.ts` (flag on/off, métricas, não-admin) e `save-booking.test.ts` (trava antes de conferir).
- Integração `tests/integration/admin-panel.int.test.ts` (relógio fixo, quarta 02/01/2030): bloqueio recusado pelo `saveBooking` (home nova e agenda antiga) e escondido no `getDayBookings`; desbloquear; bloquear horário reservado recusado; bloquear e reservar ao mesmo tempo grava só um; bloquear dia inteiro mantém as reservas existentes; desbloquear dia; conta comum não consegue bloquear dia; reserva manual (MANUAL, sem userId, telefone em dígitos, ocupa para o cliente); recusas da reserva manual; cancelamento do admin (`byAdmin`, `source`, métrica); conta comum recusada em todas as actions sem mudar o banco.
- e2e `e2e/admin-painel.spec.ts` (`ADMIN_PANEL_V2=admin` no `playwright.config.ts`): bloquear com motivo → cliente vê "ocupado" na home nova e não vê o horário na `/barbershop/[id]` → desbloquear; reserva manual com link do WhatsApp → cancelamento pelo admin → "Livre" e canceladas +1; bloquear dia inteiro mantém a reserva → desbloquear dia; 44px e sem rolagem horizontal em 390px; no computador (1280px), coluna de até 672px centralizada e botões na linha do horário.

- `vitest.config.mts`: `AGENDA_V2`, `NEW_HOME` e `ADMIN_PANEL_V2` fixas em `off` nos projetos unit e integração. Antes os testes herdavam as flags do `.env` local (com `AGENDA_V2=all` local, 8 unit e 6 de integração falhavam); cada teste continua ligando a sua com `vi.stubEnv`.

**Validação (local, 2026-10-19, depois do ajuste de layout):** `npm run lint` ✅ · `npm run test:unit` 148 ✅ · `npm run test:int` 33 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 33 ✅ em 2 de 3 rodadas; na 1ª, 3 testes do `login-resume.spec` (não alterado) passaram do tempo e depois passaram 9/9 com `--repeat-each 3`.

**Staging:** `fase3/painel-admin` enviado para `staging` (Preview com `ADMIN_PANEL_V2=admin`).

**Teste de aceite (staging) ✅:** aprovado pelo dono em 2026-10-19, no computador e no celular.

**Produção (2026-10-19) ✅:** PR #17 mergeado na `main` (`a4a344c`) e publicado pela Vercel. `ADMIN_PANEL_V2=admin` criada pelo dono em Production; painel novo funcionando em produção. O bloqueio escondido na `/barbershop/[id]` e o `getDayBookings` sem dado pessoal valem para todos sem flag.

**Pendências:**
- [x] Vercel Preview: `ADMIN_PANEL_V2=admin` (criada pelo dono).
- [x] Vercel Production: `ADMIN_PANEL_V2=admin` criada pelo dono; painel novo funcionando em produção.
- [x] Teste de aceite do dono: localhost e staging ✅ em 2026-10-19.
- [ ] Lighthouse/axe do `/adm` novo (não rodado neste prompt).

## Incidente 2026-10-19 · EMAXCONNSESSION em produção

**O que aconteceu:** por volta das 20:55, depois de 2 redeploys seguidos, a home e o `/adm` de produção deram erro `EMAXCONNSESSION max clients reached in session mode (pool_size 15)`.

**Causa:** a `DATABASE_URL` de Production apontava para o **Session pooler** do Supabase (porta 5432). No modo session cada conexão do Prisma prende uma conexão do pool (15) enquanto a instância vive. Na Vercel cada função (rota) tem instâncias próprias, cada uma com o pool padrão do Prisma (`núcleos × 2 + 1` conexões), e no redeploy as instâncias antigas continuam vivas enquanto as novas sobem: 3 ou 4 instâncias bastam para chegar a 15.

**Correção (feita pelo dono na Vercel, Production):** `DATABASE_URL` trocada para o **Transaction pooler**, porta **6543**, com `?pgbouncer=true&connection_limit=1`, e redeploy. Tudo voltou.

**Conferência no código (sem tocar em produção):**
- `PrismaClient` era um por processo (topo do módulo). Agora fica em `globalThis` também em produção (`app/_lib/prisma.ts`), para não abrir outro pool se o módulo for carregado de novo.
- Compatível com transaction pooler + `pgbouncer=true`: interactive transactions e `$transaction([...])` (o pooler prende uma conexão do `BEGIN` ao `COMMIT`), `pg_advisory_xact_lock` (trava de transação, sai no commit; `pg_advisory_lock` de sessão é que não funcionaria) e prepared statements (desligados pelo `pgbouncer=true`). Nada de `SET`, `LISTEN/NOTIFY` ou tabela temporária.
- Incompatíveis com a 6543: `prisma migrate deploy/resolve/status` (trava de sessão) e `pg_dump`. Continuam na **5432**, pelo `.env.producao-backup` (fora do git). O build da Vercel é só `next build` (não roda migrate).
- Com `connection_limit=1`, requests simultâneos na mesma instância fazem fila. As interactive transactions (`saveBooking`, `blockSlot`, `blockDay`, `createManualBooking`) usam `INTERACTIVE_TX_OPTIONS` (`app/_lib/transaction.ts`): `maxWait` 10s (padrão do Prisma: 2s) e `timeout` 10s (o `blockDay` tinha 15s). P2028 (não começou a tempo / passou do tempo) vira "Muita gente reservando agora, tente de novo em instantes." em vez do erro genérico (`BUSY` em `booking-errors.ts` e nas actions do admin).

**Documentação:** `CLAUDE.md` (Environment), `.env.example` (comentário sem segredos) e a tabela de ambientes acima.

**Testes:** unit `prisma.test.ts` (mesmo cliente em `globalThis` com `NODE_ENV=production`), `save-booking.test.ts` e `admin-actions.test.ts` (opções da transação e P2028 → BUSY), `booking-errors.test.ts`.

**Validação (local, 2026-10-19):** `npm run lint` ✅ · `npm run test:unit` 153 ✅ · `npm run test:int` 33 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 33 ✅ em 2 rodadas seguidas.

**Produção:** publicado em produção — previsto após o merge. Nenhuma variável da Vercel alterada por este PR.

## Prompt 18 · Mensalistas (MEL-025)

**Feito:**
- Flag `MENSALISTAS` (`off | admin | all`, padrão `off`; `isMensalistasEnabled` em `app/_lib/flags.ts`). Aba e actions: `admin` ou `all` ligam para o admin. "Meu próximo agendamento" do mensalista com conta: com `admin` só o admin se vê; `all` liga para todos os clientes.
- AdminTabs (`app/adm/_components/admin-tabs.tsx`): Agenda | Mensalistas no topo do `/adm` e do `/adm/mensalistas`, 44px, aba ativa `#7354F5` com `aria-current="page"` e badge com o número de renovações pendentes.
- `/adm/mensalistas` (só `isAdmin`; flag desligada volta para o `/adm`): cartão por mensalista com nome, WhatsApp (`wa.me`), "Toda sexta · 10:30", barra de 4 segmentos + "2 de 4 — termina 08/11", próximo atendimento e ações (Registrar pagamento/Renovar, Editar, Pausar/Reativar, Excluir com AlertDialog). Ordem: renovações no topo, ativos pelo próximo atendimento, pausados. Excluídos não aparecem.
- Cadastro/edição (`save-mensalista.ts`): nome, WhatsApp (só dígitos), e-mail da conta Google opcional (minúsculo), dia (sexta/sábado) e horário fixos da grade. Dois mensalistas **ativos** não dividem dia e horário (trava `mensalista-fixo:<dia>:<hora>`). Mudar dia/horário vale a partir do próximo ciclo (D4h).
- Registrar pagamento (`register-mensalista-payment.ts`): escolhe o serviço (padrão: o do ciclo anterior) e, para quem já estava no meio de um ciclo, "Ciclo já em andamento" com "Fins de semana restantes" (1–4). Numa transação: trava o mensalista, trava os horários em ordem (`lockSlot`) e confere reserva e bloqueio. **Tudo ou nada**: com conflito nada é gravado e o Sheet lista "Sex 23/10 às 10:30 — Reserva de João" / "Mensalista Pedro" / "Bloqueado · Feriado". Sem conflito: `MensalistaCycle` (`weekends` = sextas geradas, `endsAt` = domingo depois do último) e 1 `Booking` por fim de semana (`source = MENSALISTA`, `cycleId`, `userId = null`, nome e WhatsApp copiados). Prévia das datas antes de confirmar.
- Regras do ciclo (`app/_lib/mensalista-cycle.ts`, funções puras): 1º fim de semana = o primeiro cujo horário fixo ainda está por vir (D4a); a renovação começa depois do último fim de semana do ciclo anterior (D4b) e só é aceita no último fim de semana ou depois de vencido (dois cliques não criam dois ciclos); `paidAt` = agora (D4c). "x de 4" = fim de semana atual ou próximo, contando os que já tinham passado antes do cadastro: 2 restantes → "3 de 4". Aviso de renovação no último fim de semana ou vencido (D4d).
- Pausar/Excluir (`mensalista-status.ts`): cancelam as reservas futuras do mensalista, cada uma com `BookingCancellation` (`byAdmin = true`, `source = MENSALISTA`), e encurtam o `endsAt` do ciclo para o último fim de semana já começado. Reativar volta a ATIVO sem recriar reservas (precisa de novo pagamento) e confere se o horário fixo não foi para outro ativo. Excluir só marca `EXCLUIDO`; ciclos e reservas passadas ficam.
- Grade do `/adm`: reserva de mensalista com selo "Mensalista" e botão "Desmarcar esta semana" (o diálogo avisa que conta como usado). Usa o `adminCancelBooking` existente.
- Home nova: "Meu próximo agendamento" busca também a reserva de mensalista ativo com o e-mail da conta, sem diferenciar maiúsculas (`app/_lib/next-booking.ts`). O cartão mostra "· Mensalista" e "Para remarcar, fale com o Cris.", sem link (não está em `/bookings` e o cliente não cancela).
- A regra "agenda abre na segunda" continua só no caminho do cliente (`getNextServiceDays`); a geração do ciclo valida grade, futuro e reserva/bloqueio sem essa regra. Quando a semana abre, o horário do mensalista já aparece ocupado.
- Sem migração.

**Decisões (aprovadas pelo dono em 2026-10-19):**
- D2: falta ou "Desmarcar esta semana" conta como usado; o ciclo não estende.
- D3: nunca sobrescrever; pagamento tudo ou nada com a lista de conflitos (substitui o "pula conflitos" da spec §5/§6).
- D4 a–l como no plano; serviço escolhido no pagamento, sem coluna nova (D5).
- Ajuste do dono: "Ciclo já em andamento" com 1–4 fins de semana restantes, sem migração (`weekends[]` guarda só os gerados; o progresso conta `4 − weekends.length` como já usados).
- Pausar no meio do fim de semana (sexta ou sábado) conta aquele fim de semana como usado, mesmo que o horário de sábado ainda não tenha chegado.

**Testes:**
- Unit: `mensalista-cycle.test.ts` (sexta da semana, início do ciclo em seg/sex/sáb/dom antes e depois do horário, 2 restantes, renovação, progresso "2 de 4"/"3 de 4"/vencido/pausado, `truncatedEndsAt`), `mensalista-actions.test.ts` (sem sessão e conta comum recusadas sem tocar no banco, validação, P2028 → BUSY), `adm/mensalistas/page.test.ts`, `adm/page.test.ts` (badge só com a flag), `flags.test.ts`.
- Integração `tests/integration/mensalistas.int.test.ts` (relógio fixo, quarta 02/01/2030): conta comum recusada em todas as actions; cadastro e validações; mesmo horário fixo recusado e pausado liberando; geração das 4 reservas; conflito com cliente e bloqueio sem gravar nada; conflito com outro mensalista; dois pagamentos simultâneos geram 1 ciclo; pausado/excluído recusados; cliente não reserva o horário do mensalista quando a semana abre; **2 restantes** (gera 2, "3 de 4", renovação recusada antes do último fim de semana e começando depois do 2º); falta não estende; pausar (canceladas com registro, ciclo encurtado, horário livre, reativar exige pagamento); excluir mantém histórico; "Meu próximo agendamento" por e-mail com e sem flag.
- e2e `e2e/mensalistas.spec.ts` (`MENSALISTAS=all` no `playwright.config.ts`, relógio `SCHEDULE_NOW`): cadastrar → pagamento com 2 restantes → "3 de 4" → selo e "Desmarcar esta semana" na grade → home do mensalista com conta mostra a reserva e outro cliente vê ocupado → conflito lista a data e não grava → pausar cancela 2 reservas.
- `vitest.config.mts`: `MENSALISTAS` fixa em `off` nos projetos.

**Validação (local, 2026-10-19; repetida em 2026-10-20 antes do commit):** `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm run test:unit` 200 ✅ · `npm run test:int` 48 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 34 ✅.

**Teste de aceite (localhost) ✅:** aprovado pelo dono em 2026-10-20: cadastro, ciclo em andamento ("3 de 4"), selo "Mensalista" na grade, reserva em "Meu próximo agendamento" do mensalista, horário ocupado para outra conta, conflito sem gravar nada, pausar com as reservas futuras canceladas e excluir. O botão "Registrar pagamento" some durante o ciclo (só volta como "Renovar" no último fim de semana ou vencido) — comportamento aprovado.

**Staging:** `fase3/mensalistas` enviado para `staging` (`d49c9a6`), com `MENSALISTAS=admin` no Preview (criada pelo dono).

**Teste de aceite (staging) ✅:** aprovado pelo dono em 2026-10-20, no celular: abas, cadastro, pagamento, selo "Mensalista" na agenda e exclusão.

**Produção:** publicado em produção — previsto após o merge. Sem migração. Depois do merge, o dono cria `MENSALISTAS=admin` na Vercel (Production) e faz redeploy; sem ela a aba fica escondida.

**Pendências:**
- [x] Teste de aceite do dono no localhost ✅ em 2026-10-20.
- [x] Teste de aceite do dono na staging ✅ em 2026-10-20 (celular).
- [x] Vercel Preview: `MENSALISTAS=admin` (criada pelo dono).
- [ ] Vercel Production: criar `MENSALISTAS=admin` (dono) e fazer redeploy; sem ela a aba fica escondida.
- [ ] Cadastrar os mensalistas atuais do Cris com "Ciclo já em andamento".
- [ ] Mensalista "sem horário fixo" (reserva na mão, spec §5.3) não entrou: o cadastro exige dia e horário.
- [ ] `/bookings` não lista a reserva de mensalista (só a home nova mostra).
- [ ] Lighthouse/axe do `/adm/mensalistas` (não rodado).

## Prompt 19 · Notificações (MEL-022)

**Feito:**
- Flag `NOTIFICACOES` (`off | admin | all`, padrão `off`; substitui o `NOTIFY_EMAIL` da spec). Na tela, pela sessão (`isNotificacoesEnabled`); no Cron e nos avisos, pelo cliente da reserva lido do banco (`isNotificacoesEnabledForUser`): com `admin`, só reservas e cancelamentos de quem é admin geram e-mail.
- E-mail por Gmail SMTP (`nodemailer` 10, com `overrides` no `package.json`: o peer opcional do `next-auth` pede a 7, que tem avisos de segurança altos, corrigidos só depois da 10.0.5; o `next-auth` só usa o nodemailer no provider de e-mail, que não usamos) com conta dedicada (`SMTP_USER`/`SMTP_PASS`), ponto único em `app/_lib/notifications/transport.ts`. Textos aprovados (spec §4.9) em `templates.ts`: texto puro + HTML leve, sem imagem, rodapé "Cris du Corte · {endereço} · Não responda este e-mail — fale com o Cris pelo WhatsApp: {wa.me}" (sem telefone: sem link).
- Eventos: reserva do cliente → confirmação + "Nova reserva" para todos os `User.isAdmin`; cliente cancela → "Cancelou" para o Cris; Cris cancela (painel ou `cancelBooking` de outra pessoa) → aviso ao cliente; véspera → lembrete; mensalista no último fim de semana do ciclo (ou vencido sem renovação) → 1 e-mail ao Cris com todos, 1x por ciclo. Reserva manual, reserva do próprio Cris e Pausar/Excluir mensalista não enviam nada. Lembrete de mensalista vai para a conta com o mesmo e-mail (sem diferenciar maiúsculas).
- Envio sempre depois do commit, em segundo plano (`runInBackground` com `waitUntil` do `@vercel/functions`), e nunca lança: falha no e-mail não desfaz nem atrasa reserva/cancelamento. No cancelamento, a reserva é lida (usuário, serviço, barbearia) antes do delete.
- Idempotência (`NotificationLog`, `log.ts`): key única por evento (`confirm:<reserva>`, `reminder:<reserva>`, `admin-new:<reserva>:<admin>`, `renewal:<ciclo>:<admin>`…). Só quem cria a linha em `SENDING` (ou retoma uma `FAILED` com tentativa sobrando) envia. `SENDING` parado há 10 min vira `FAILED` final sem reenviar (na dúvida, não manda dois). Confirmação e "Nova reserva" que falharam: até 3 tentativas nos próximos Crons, se a reserva ainda for futura. Lembrete: 2ª tentativa na mesma rodada. Avisos de cancelamento: 1 tentativa (a reserva já foi apagada). Sem e-mail nem texto no registro (LGPD); erro do SMTP gravado com os endereços trocados por `<e-mail>`.
- Cron (`vercel.json`): `0 23 * * 4,5` = qui e sex às 20h em SP (Hobby: 1x/dia, em algum minuto da hora; só roda em Production). `/api/cron/notificacoes` exige `Authorization: Bearer <CRON_SECRET>`; `?dia=yyyy-MM-dd` só fora de produção (teste na staging). Reserva feita depois do Cron da véspera não recebe lembrete (a confirmação já chegou).
- Opt-out (decisão do dono: só o lembrete): switch "Lembretes por e-mail" no Perfil (só com a flag; linha inteira de 44px, `role="switch"`) e link "Não quero mais lembretes" no lembrete → `/notificacoes/lembretes` (abrir não desliga; só o botão), mais `List-Unsubscribe` + `List-Unsubscribe-Post` (one-click do Gmail, `POST /api/notificacoes/lembretes`). Token HMAC do id do usuário com o `NEXTAUTH_SECRET`, em contexto próprio. Confirmação e "o Cris cancelou" sempre saem.
- `NOTIFY_ALLOWLIST` (só staging): com a lista definida, ninguém fora dela recebe (`SKIPPED`).
- WhatsAppButton (MEL-022): depois da reserva na home nova, cartão "Reservado! Sex 23 às 10:30." com "Enviar confirmação no WhatsApp" (`wa.me` do `Barbershop.phone` com serviço, dia, hora e endereço) e "Ver meus agendamentos". Só com a flag e com telefone cadastrado; sem isso a tela fica como antes (só o toast).
- Política de Privacidade: parágrafo sobre o uso do e-mail (confirmação, lembrete, aviso de cancelamento; lembrete pode ser desligado; envio por conta Gmail da barbearia), mostrado com a flag e com a data 21/10/2026. **A revisão jurídica continua pendente.**
- Migração `20261021000000_notificacoes` (só aditiva): `User.emailReminders` (default true), `Barbershop.phone` (opcional; decisão do dono: telefone no banco, sem número no código), enum `NotificationStatus` e tabela `NotificationLog`. Aplicada no Neon dev e no Neon "Testes". Produção: `prisma/sql/notificacoes-producao.sql` (o dono roda à mão).
- Neon dev: telefone do Cris gravado na barbearia "Cris Du Corte" (o mesmo de `/privacidade`), para o teste na staging. O Neon dev tem 1 admin com e-mail.

**Testes:**
- Unit: `templates.test.ts` (assuntos aprovados, fuso, rodapé com/sem telefone, escape de HTML, links pelo `NEXTAUTH_URL`), `unsubscribe-token.test.ts`, `transport.test.ts` (sem credenciais não envia; senha de app sem espaços), `log.test.ts` (erro sem e-mail), `route.test.ts` do Cron (401 sem Bearer, com Bearer errado e sem segredo; flag off; `?dia` recusado em produção), `whatsapp-message.test.ts`, `set-email-reminders.test.ts`, `flags.test.ts`. `save-booking`, `cancel-booking` e `admin-actions` conferem o envio depois do commit e que falha no e-mail não muda o resultado.
- Integração `tests/integration/notificacoes.int.test.ts` (Postgres real, envio mockado, 22 casos): flag off/admin/all; confirmação + "Nova reserva"; evento repetido e concorrente envia 1x; SMTP fora → reserva gravada, `FAILED`, Cron tenta até 3; falha passageira reenviada; allowlist; `SENDING` parado não reenvia; avisos de cancelamento (cliente, painel, `cancelBooking` do admin, manual sem conta, SMTP fora); lembrete 1 por reserva com one-click, Cron duplo/concorrente 1x, opt-out (lembrete `SKIPPED`, confirmação sai), mensalista pela conta com o mesmo e-mail, link do e-mail; renovação 1x por ciclo, com todos num e-mail.
- e2e `e2e/notificacoes.spec.ts` (`NOTIFICACOES=admin`, Gmail zerado no `playwright.config.ts`): cliente não vê o switch; admin desliga e fica salvo; botão do WhatsApp com o texto pronto; link de opt-out inválido.
- `vitest.config.mts` e `playwright.config.ts` zeram `SMTP_USER`/`SMTP_PASS`/`NOTIFY_ALLOWLIST`/`CRON_SECRET`: nada sai dos testes.

**Entregabilidade (decisão do dono em 2026-10-21, conta remetente nova; spec §4.9):**
- Assuntos sem "!" e mais pessoais ("Sua reserva com o Cris — sex 23/10 às 09:00"); multipart texto + HTML; no máximo 2 links por e-mail, sempre com texto (o `compose` recusa um 3º); `Reply-To` = e-mails dos `User.isAdmin` nos e-mails ao cliente (avisos ao Cris sem Reply-To); `List-Unsubscribe` só no lembrete.
- Rodapé ao cliente: "Dúvidas? Responda este e-mail ou chame o Cris no WhatsApp: (31) 9xxxx-xxxx" (número com link só se couber no limite; no lembrete vai como texto). Rodapé ao Cris: "Aviso automático do app de agendamento."
- Cartão de sucesso da reserva (home nova), com a flag ligada para o usuário: "Enviamos a confirmação para o seu e-mail. Se não encontrar, olhe no Spam e marque 'Não é spam'." (aparece mesmo sem telefone; o WhatsAppButton continua dependendo do telefone).
- Rollout: o dono decidiu ligar `NOTIFICACOES=all` direto em produção (sem a fase `admin`).
- `prisma/sql/notificacoes-producao.sql` reorganizado em consultas numeradas, para rodar uma por vez (1.1–1.6, bloco 2, 3.1–3.9, bloco 4 + 4.1); testadas no Neon dev (16 consultas de leitura).
- Neon dev: 2 reservas com envio real (`CONFIRMATION` e `ADMIN_NEW_BOOKING` em `SENT`, 21/10 às 20:07 e 20:29 UTC): o Gmail SMTP do dono funciona.

**Validação (local, 2026-10-21, depois da entregabilidade):** `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm run test:unit` 239 ✅ · `npm run test:int` 70 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 39 ✅ (o teste da home nova agora espera o toast e o cartão de sucesso do admin).

**Staging:** `a9e7b2e` enviado para `staging`; o deploy da Vercel falhou (sem log acessível daqui; não se repetiu). `f42fe82` (entregabilidade) enviado para `staging` em 2026-10-21: deploy ✅, com as variáveis de Preview criadas pelo dono.

**Produção:** publicado em produção — previsto após o merge. Em 2026-10-21, antes do merge: backup `prod-2026-10-21-notificacoes.dump` (dono, fora do Git); `prisma/sql/notificacoes-producao.sql` aplicado à mão pelo dono no Supabase e conferido (usuários, hash e reservas iguais; colunas e tabela novas; telefone do Cris gravado); `npx prisma migrate resolve --applied 20261021000000_notificacoes` pela 5432 (autorizado pelo dono) e `migrate status` = "Database schema is up to date!". Variáveis de Production criadas pelo dono: `NOTIFICACOES=all`, `SMTP_USER`, `SMTP_PASS`, `CRON_SECRET` (sem `NOTIFY_ALLOWLIST`). O Cron (`vercel.json`) passa a valer com o deploy de Production; o primeiro lembrete real sai na quinta seguinte, entre 20:00 e 20:59.

**Pendências:**
- [x] Dono: conta Gmail dedicada e senha de app (envio real `SENT` no Neon dev).
- [x] Vercel Preview: variáveis criadas pelo dono.
- [x] Push repetido (`f42fe82`): deploy da staging ✅.
- [ ] Teste de aceite do dono na staging (celular): e-mails na caixa de entrada (não no spam), Reply-To, botão do WhatsApp, aviso no cartão, switch e link de opt-out.
- [x] Produção: SQL aplicado à mão e conferido, telefone do Cris gravado e `migrate resolve` registrado (2026-10-21).
- [x] Vercel Production: `NOTIFICACOES=all`, `SMTP_USER`, `SMTP_PASS`, `CRON_SECRET` (criadas pelo dono); sem `NOTIFY_ALLOWLIST`.
- [ ] Depois do deploy: reserva de teste em produção (confirmação, "Nova reserva", cartão de sucesso) e conferir o Cron em Vercel → Settings → Cron Jobs.
- [ ] Primeira quinta depois do deploy: conferir que os lembretes saíram (`NotificationLog` com `REMINDER`/`SENT`).
- [ ] Revisão jurídica da Política de Privacidade (continua pendente, agora com o parágrafo dos e-mails).
- [ ] Ao atualizar o `next-auth`, conferir se o `overrides` do `nodemailer` ainda é necessário.

## Prompt 20 · PR A · Adicionar ao calendário (MEL-023)

**Decisões (aprovadas pelo dono em 2026-10-21):** plano do Prompt 20 em 3 PRs (A calendário → B PWA → C Web Push); calendário atrás da flag `CALENDARIO` (regra "todo visível atrás de flag"); evento com **60 minutos fixos** (mesmo no 09:00, cuja grade vai até 10:30); **nenhum merge em produção antes de sexta 23/10**, depois que o dono confirmar os primeiros lembretes reais (qui 22/10, 20h).

**Feito:**
- Flag `CALENDARIO` (`off | admin | all`, padrão `off`), `isCalendarioEnabled` em `app/_lib/flags.ts`.
- `app/_lib/calendar.ts` (funções puras): link do Google Agenda (`dates` em UTC + `ctz=America/Sao_Paulo`) e `.ics` (RFC 5545: CRLF, linhas dobradas em 75 octetos sem cortar acento, escape de `\ ; ,` e quebra de linha, `UID` estável por dia e hora — adicionar de novo atualiza em vez de duplicar —, `VALARM` 1 hora antes). Horário de SP → UTC por `fromZonedTime`. Título "{Serviço} · Cris du Corte"; descrição "Ver ou cancelar a reserva: {NEXTAUTH_URL}/bookings" (na staging, o link é dela).
- `GET /api/calendario?data=yyyy-MM-dd&hora=HH:mm&servico=<id>`: sem id de reserva e sem dado pessoal; valida a data real e o horário da grade (400), lê serviço e endereço da barbearia do banco (404 sem serviço), 404 com a flag desligada para quem pede. `text/calendar`, `inline` (no iPhone o Safari abre direto "Adicionar ao Calendário"), `private, no-store`.
- `AddToCalendar` (cliente): botão "Adicionar ao calendário" (`aria-expanded`, 44px) que abre "Google Agenda" (nova aba) e "Apple / Outlook" (.ics). No cartão de sucesso da reserva (home nova), antes do WhatsApp; o cartão passa a aparecer também só com a flag do calendário. Em "Meu próximo agendamento", abaixo do cartão (fora do link para `/bookings`), inclusive para a reserva de mensalista. `getNextBooking` passa a trazer o endereço da barbearia.

**Testes:**
- Unit: `calendar.test.ts` (09:00 e 19:30 de SP em UTC com 1 hora, data/horário inválidos, link do Google, `.ics` com CRLF/UID/DTSTAMP/alarme/endereço escapado, dobra de linha com acento), `api/calendario/route.test.ts` (flag off/admin/all, 400 sem ler o banco, 404, cabeçalhos e corpo com o link da staging), `flags.test.ts`.
- e2e `e2e/calendario.spec.ts` (`CALENDARIO=admin` no `playwright.config.ts`): admin reserva → botão no cartão (fechado, 44px) → link do Google com `dates` certas → `.ics` da rota com `DTSTART`/`DTEND` certos → mesmo botão em "Meu próximo agendamento"; cliente comum não vê o botão e a rota responde 404.
- `vitest.config.mts`: `CALENDARIO` fixa em `off`.

**Validação (local, 2026-10-21):** `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm run test:unit` 251 ✅ · `npm run test:int` 70 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 41 ✅.

**Teste de aceite (localhost) ✅:** aprovado pelo dono em 2026-10-21: Google Agenda com título, horário (11:30–12:30, fuso certo) e endereço; `.ics` ok; botão em "Meu próximo agendamento" ok.

**Staging:** `d2bc8f6` enviado para `staging` em 2026-10-21 (autorizado pelo dono).

**Produção:** publicado em produção — previsto após o merge (não antes de sexta 23/10, depois da confirmação dos lembretes). Sem migração. Variável nova: `CALENDARIO` (Preview: `admin`; Production: `admin` no deploy, `all` depois do aceite no iPhone).

**Pendências:**
- [x] Teste de aceite do dono no localhost ✅ em 2026-10-21.
- [ ] Staging: `CALENDARIO=admin` no Preview (dono); aceite no iPhone (.ics abre "Adicionar ao Calendário") e no Android (Google Agenda).
- [ ] Vercel Production: `CALENDARIO=admin` e depois `all` (dono).

## Prompt 20 · PR B · PWA: manifest, ícones, service worker e dica de instalação (MEL-023)

**Decisões (aprovadas pelo dono em 2026-10-21):** SW escrito à mão (sem next-pwa/serwist); cache só de assets imutáveis, sem modo offline; manifest e `theme-color` **sempre publicados** (fora de flag); SW e dica atrás de `PWA_INSTALL`.

**Feito:**
- `app/manifest.ts` (`/manifest.webmanifest`): "Cris du Corte", `standalone`, `start_url`/`scope`/`id` `/`, `pt-BR`, fundo e tema `#15161A` (`BRAND_BACKGROUND` em `site.ts`), ícones `any` e `maskable` em 192 e 512 (`public/icons`, gerados uma vez a partir de `app/icon.png` com sharp fora do projeto; maskable com o logo em 72% do quadro, dentro da zona segura). `apple-icon.png` (180, opaco) mantido. `viewport.themeColor` e `appleWebApp` (abre sem a barra do Safari quando instalado) no `layout.tsx`.
- Service worker (`app/_lib/pwa/service-worker.ts`, servido por `app/sw.js/route.ts` com `no-cache, no-store`): `/_next/static/*` cache-first; `/icons/*` e `/brand/*` stale-while-revalidate; **todo o resto não é interceptado** (páginas, RSC, Server Actions, `/api`, login do NextAuth, POST, `Range`). Versão = `VERCEL_GIT_COMMIT_SHA`: cada deploy instala o SW novo, que assume na hora (`skipWaiting` + `clients.claim`) e apaga os caches das versões anteriores. Com `PWA_INSTALL=off`, o `/sw.js` vira um script que apaga os caches e se desinstala (rollback sem deploy de código).
- `SwRegister` (no layout): registra depois do `load`, em `requestIdleCallback` (Safari: `setTimeout`), só no build de produção; `updateViaCache: "none"`. Flag desligada para o usuário (ex.: `admin` e cliente comum) → remove o SW que houver.
- `InstallHint` (home nova, com a flag; **ajuste de design do dono em 2026-10-21**): cartão compacto de 1 linha fixo no rodapé da tela (ícone + "Instale o app do Cris" + "Instalar" + ✕ com `aria-label="Agora não"`, alvos de 44px). Android/computador: "Instalar" abre o prompt nativo (`beforeinstallprompt`). iPhone/iPad (inclusive iPadOS como Mac): "Instalar" abre a linha "No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início" (`aria-expanded`). Navegador do Instagram/Facebook: nada. **Só aparece depois de uma reserva com sucesso (evento `cdc:booking-success` do BookingPicker, guardado em `cdc-booked`) ou a partir da 2ª visita** (`cdc-visits` no `localStorage`, contado 1x por sessão do navegador via `sessionStorage`; tudo com try/catch); nunca na primeira tela da primeira visita. Enquanto visível, o `body` ganha `padding-bottom` igual à altura do cartão (ResizeObserver acompanha a linha extra do iPhone), então nada fica escondido atrás dele; ao fechar, volta a zero. Some se já estiver instalado (`display-mode: standalone`/`navigator.standalone`), no `appinstalled` ou no ✕. Fixo, fora do fluxo: aparecer não desloca nada (a 1ª versão, no meio da página, empurrava o rodapé: CLS 0,011 → 0,038).

**Testes:**
- Unit: `app/_lib/pwa/install-hint.test.ts` (iPhone, iPad como Mac, Mac, Android, Instagram; standalone; 2ª visita ou reserva; 1 visita por sessão; armazenamento ausente ou que lança), `app/sw.js/route.test.ts` (cabeçalhos; `off` → script que se remove; versão do commit; cache só de `/_next/static`; sem navegação/RSC/`/api`; os dois scripts compilam), `app/manifest.test.ts`, `flags.test.ts`.
- e2e `e2e/pwa.spec.ts` (`PWA_INSTALL=admin` no `playwright.config.ts`): manifest com ícones reais (status, tipo e tamanho lido do PNG), `theme-color`, `apple-touch-icon`; `/sw.js` sem cache; admin: SW controla a página, navegação vem da rede e chunks do SW, reserva (Server Action) funciona e a página seguinte mostra o horário ocupado; cliente comum sem SW; iPhone: 1ª visita sem dica (recarregar não conta), 2ª visita (nova aba) com cartão de 1 linha (< 70px, botões de 44px), `padding-bottom` = altura do cartão e rodapé acima dele, "Instalar" abre a instrução e o espaço cresce junto, ✕ fecha, zera o espaço e continua fechada; 1ª visita + reserva com sucesso → dica aparece; cliente comum sem dica nem na 2ª visita.
- `vitest.config.mts`: `PWA_INSTALL` fixa em `off`.

**Lighthouse 13.5 (local, `next start`, Neon dev, celular, deslogado, home nova), rodadas intercaladas `PWA_INSTALL=all` × `off`:** desempenho 85/86/85 × 85/85/84; acessibilidade 100 × 100; CLS 0,011 × 0,011; LCP ~4,3s nas duas (banco em us-east-2, como nas medições anteriores). Sem diferença do PWA; conferir no PageSpeed em produção depois do merge. Depois do ajuste de design (1ª visita, sem dica): desempenho 84–85, acessibilidade 100, CLS 0,011 (o mesmo de antes). Com a dica visível (2ª visita; o Lighthouse sempre simula a 1ª, então medido com Playwright + iPhone 13 + axe-core 4.10): CLS 0,000 e axe sem violações, com a instrução fechada e aberta.

**Validação (local, 2026-10-21):** `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm run test:unit` 263 ✅ · `npm run test:int` 70 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 48 ✅ (depois do ajuste de design, um de cada vez). (Integração e e2e rodados ao mesmo tempo no mesmo banco de testes se atrapalham: rodar um de cada vez.)

**Produção:** publicado em produção — previsto após o merge (não antes de sexta 23/10). Sem migração. Variável nova: `PWA_INSTALL` (Preview: `admin`; Production: `admin`, depois `all`). O manifest e o `theme-color` entram para todos já no deploy.

**Pendências:**
- [x] Teste de aceite do dono no localhost (Chrome do PC) ✅ em 2026-10-21: dica, instalação em janela própria, reservar/cancelar/login no app, "Agora não", desinstalação. Pedido de ajuste de design (cartão de 1 linha, espaço no fim da página, só após reserva ou 2ª visita) feito acima.
- [x] Vercel Preview: `PWA_INSTALL=admin` (criada pelo dono).
- [x] Staging: `b443ed4` enviado para `staging` em 2026-10-21 (autorizado pelo dono).
- [ ] Staging: conferir o cartão de 1 linha no celular; instalar no Android e no iPhone, abrir pelo ícone, reservar e cancelar pelo app instalado, login pelo Google dentro do app instalado.
- [ ] Vercel Production: `PWA_INSTALL=admin` e depois `all` (dono).
- [ ] PageSpeed da home em produção depois do merge (desempenho ≥ 90, acessibilidade 100).

## Prompt 20 · PR C · Web Push: notificações no celular (MEL-023)

**Decisões (aprovadas pelo dono em 2026-10-21):** migração `PushSubscription` aprovada (produção por SQL manual, como no Prompt 19); a inscrição é o opt-in do lembrete por push (não depende de `emailReminders`); textos do push, do Perfil e o parágrafo da Política aprovados (spec §4.10); push de teste ao ligar; flag `WEB_PUSH` (`admin` primeiro).

**Feito:**
- Migração `20261022000000_web_push` (só aditiva): tabela `PushSubscription` (`endpoint` único, chaves `p256dh`/`auth`, `lastSuccessAt`; FK para `User` com `ON DELETE CASCADE`: excluir a conta apaga as inscrições). Aplicada no Neon dev; no Neon "Testes" pelo `migrate deploy` do setup. Produção: `prisma/sql/web-push-producao.sql` (ANTES 1.1–1.4 / MIGRAÇÃO bloco 2 / CONFERÊNCIA 3.1–3.6; 11 consultas de leitura testadas no Neon dev; nenhum UPDATE).
- Chaves VAPID: dois pares (Preview e Production) gerados em `.env.vapid.local` (fora do Git pela regra `.env*.local`), sem imprimir no terminal. O `VAPID_SUBJECT` ficou para o dono preencher (`mailto:` da conta Gmail da barbearia).
- Flag `WEB_PUSH` (`off | admin | all`); `isWebPushEnabled` (Perfil, Política) e `isWebPushEnabledForUser` (envio, pelo cliente da reserva).
- Envio (`app/_lib/notifications/push.ts`, lib `web-push` 3.6.7, sem alertas novos no `npm audit`): VAPID, urgência alta, TTL entre 1 min e 24 h (lembrete: até o horário da reserva), timeout de 10 s. **Só endpoints https de serviços de push conhecidos** (FCM, Apple, Mozilla, Windows): o servidor faz POST na URL que veio do navegador, então qualquer outra é recusada (sem SSRF). 404/410 = inscrição vencida → apagada.
- `notify.ts`: canal push ao lado do e-mail, só em dois eventos. Lembrete da véspera (`sendPushReminders`, na mesma rodada do Cron, mesmas reservas e mesma regra do mensalista com conta; 2ª tentativa na hora) e "o Cris cancelou" (1 tentativa). Key própria (`push-reminder:<reserva>`, `push-cancelled-by-admin:<reserva>`; kinds `PUSH_REMINDER`/`PUSH_CANCELLED_BY_ADMIN`, sem migração: `kind` é texto), mesma idempotência do `NotificationLog`: e-mail e push saem 1x cada e um falhar não segura o outro. Todos os aparelhos da conta recebem; `SENT` se pelo menos 1 recebeu. Sem inscrição: nada (nem registro). `NOTIFY_ALLOWLIST` vale também para o push. O Cron agora só para com `NOTIFICACOES` **e** `WEB_PUSH` desligadas.
- Service worker: `push` (sempre mostra a notificação, com ícone e `tag` por reserva) e `notificationclick` (foca a janela do app e abre a página do aviso; só URLs do próprio site). O SW fica ligado com `PWA_INSTALL` **ou** `WEB_PUSH`; as duas `off` → o `/sw.js` se remove.
- Server Actions `app/_actions/push-subscription.ts` (`assertUser`, flag, zod, rate limit): `savePushSubscription` (upsert por endpoint: o mesmo aparelho em outra conta passa para a atual; com `sendTest`, manda "Notificações ligadas" só para este aparelho) e `deletePushSubscription` (só da própria conta).
- Perfil: switch "Notificações no celular" (`role="switch"`, linha inteira de 44px), com flag e chave pública configurada. Estados: ligado/desligado pela inscrição do navegador; iPhone fora do app instalado → "No iPhone, instale o app primeiro…"; sem suporte; permissão bloqueada → desabilitado com a explicação. Ligar: pede a permissão no toque, registra o SW, inscreve (troca a inscrição se a chave VAPID mudou), grava e manda o teste. Desligar: apaga no servidor e no navegador.
- "Sair" (menu): antes do `signOut`, apaga a inscrição deste aparelho (no máximo 3 s, nunca segura o logout).
- Política de Privacidade: parágrafo do push aprovado, só com a flag.

**Testes:**
- Unit: `push.test.ts` (endpoints aceitos/recusados, inclusive IP interno, porta, usuário na URL e domínio parecido; sem VAPID não envia; payload, VAPID, TTL; 404/410 = GONE; 500/timeout = FAILED), `push-templates.test.ts` (textos aprovados, fuso), `pwa/push-client.test.ts` (estados do switch, chave base64url), `push-subscription.test.ts` (sem sessão, flag, sem VAPID, SSRF, chaves inválidas, upsert na conta da sessão, teste só para o aparelho, inscrição vencida apagada, rate limit), `sw.js/route.test.ts` (push e clique; `WEB_PUSH` mantém o SW), `flags.test.ts`, Cron (`route.test.ts`: só para com as duas flags off).
- Integração `tests/integration/web-push.int.test.ts` (Postgres real, `web-push` e e-mail mockados, 14 casos): lembrete e-mail + push 1x cada com keys separadas e Cron repetido sem reenviar; dois Crons ao mesmo tempo = 1 push; push com `emailReminders=false`; todos os aparelhos da conta; sem inscrição = sem registro; 410 apaga só a vencida; 404 na única = removida sem nova tentativa; 500 → 2ª tentativa e e-mail sai mesmo com o push fora; erro passageiro não apaga; `WEB_PUSH=admin`; sem VAPID nada sai; allowlist; "o Cris cancelou" e-mail + push; cliente que cancela não gera push; flags independentes; inscrição muda de conta; desligar só a própria; excluir conta apaga as inscrições.
- e2e `e2e/web-push.spec.ts` (`WEB_PUSH=admin`, só a chave pública no `playwright.config.ts`): switch desligado com 44px; permissão bloqueada → desabilitado com a explicação; iPhone fora do app → pede para instalar; cliente comum sem switch e sem o parágrafo; admin vê o parágrafo; `/sw.js` com push e clique. A inscrição real (FCM/Apple) fica para o teste no celular.
- `vitest.config.mts`: `WEB_PUSH=off` e `VAPID_*` vazias. `fixtures.ts`: `PushSubscription` no TRUNCATE.

**Validação (local, 2026-10-21, um de cada vez):** `npm run lint` ✅ · `npx tsc --noEmit` ✅ · `npm run test:unit` 285 ✅ · `npm run test:int` 84 ✅ (Neon "Testes") · `npm run build` ✅ · `npm run test:e2e` 53 ✅. Lighthouse não repetido (a home não mudou neste PR; o SW só ganhou os handlers de push).

**Produção:** publicado em produção — previsto após o merge (não antes de sexta 23/10). **Com migração:** antes do merge, backup + `prisma/sql/web-push-producao.sql` à mão no Supabase + `migrate resolve --applied 20261022000000_web_push` pela 5432 (dono). Variáveis novas: `WEB_PUSH` e `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (par de Production do `.env.vapid.local`).

**Pendências:**
- [x] `VAPID_SUBJECT` = `mailto:` da conta Gmail da barbearia nos dois blocos do `.env.vapid.local`.
- [x] Par VAPID de Production **refeito** em 2026-10-21 (a chave privada anterior apareceu num print e foi descartada; o par de Preview não mudou). Usar só o par novo em Production.
- [x] Vercel Preview: `WEB_PUSH=admin` + `VAPID_*` do bloco Preview (criadas pelo dono).
- [x] Staging: enviado para `staging` em 2026-10-21 (autorizado pelo dono).
- [ ] Teste de aceite no celular (staging): Android (Chrome) e iPhone (app instalado), roteiro no resumo do PR C.
- [ ] Produção (dono, antes do merge e não antes de sexta): backup, SQL, `migrate resolve`, `migrate status`.
- [ ] Vercel Production: `WEB_PUSH=admin` + `VAPID_*` do bloco Production; depois `all`.
- [ ] Revisão jurídica da Política de Privacidade (agora com o parágrafo do push).
