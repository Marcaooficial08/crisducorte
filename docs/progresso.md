# Progresso do redesign

| Prompt | Status | Data | Branch |
|---|---|---|---|
| 0 · Preparação | ✅ Concluído | 2026-10-14 | `mel-000/preparacao` |

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
