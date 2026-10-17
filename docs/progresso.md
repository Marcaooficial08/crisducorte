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
| 14 · Home nova (NEW_HOME) | 🧪 Em teste na staging | 2026-10-17 | `fase2/home-nova` |

## Ambientes

| Ambiente | URL | Origem | Banco | Observações |
|---|---|---|---|---|
| Produção | https://crisducorte.vercel.app | branch `main` | Supabase | Só leitura para conferências |
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

**Pendências:**
- [ ] Conferir a coluna centralizada no computador na staging.
- [ ] Vercel Production: criar `NEW_HOME=admin` antes do merge; depois de 7 dias, `all` (spec §6). `/classic` fica por 30 dias.
- [ ] Prompt 15: voltar com a seleção depois do login (MEL-009).

