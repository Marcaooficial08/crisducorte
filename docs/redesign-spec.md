# Cris du Corte — Especificação de Implementação

Versão de 14/10/2026 · fonte: documento "Cris du Corte — Especificação de Implementação"

## 1. Escopo e regras de negócio

Este documento especifica os 23 itens aprovados do plano (MEL-020 e MEL-021 reprovados), em 4 fases e cerca de 8–9 semanas para 1 dev. Stack mantida: Next.js 14 App Router, Prisma/Postgres, NextAuth (Google), Tailwind + shadcn/ui, deploy na Vercel (plano Hobby, gratuito).

**Regras de negócio fixas**

| Regra | Definição |
| --- | --- |
| Dias de atendimento | Somente sexta e sábado. A agenda abre na **segunda-feira** só para a sexta e o sábado **daquela semana** (fuso America/Sao_Paulo). Seg–qui: sexta e sábado. Sexta: sexta (só horários futuros) e sábado. Sábado: só o sábado (só horários futuros). Domingo: nenhum dia, com o aviso "A agenda da próxima semana abre na segunda-feira". Dia sem horário futuro sai da lista. *(Decisão do dono em 15/10/2026, substitui "sempre a próxima sexta e o próximo sábado".)* |
| Grade de horários | 09:00, 10:30, 11:30, 12:30, 13:30, 14:30, 15:30, 16:30, 17:30, 18:30, 19:30 (11 por dia, mesma grade nos dois dias) |
| Duração | Todo serviço ocupa exatamente 1 horário da grade |
| Admin | Mesmo e-mail atual (conta Google do Cris), agora via `User.isAdmin = true`; vê todos os agendamentos |
| Mensalista | Ciclo de 4 fins de semana a partir do pagamento (~30 dias); 1 atendimento por fim de semana; falta conta como usado; fim do ciclo → alerta Renovar / Excluir |
| Conflito | Nenhum processo automático sobrescreve uma reserva existente |
| Marca | Nome "Cris du Corte", roxo #8162FF mantido, botões #7354F5, dark mode |
| Custos | Nada pago: plano Hobby da Vercel, sem API oficial do WhatsApp |

**Itens por fase**

| Fase | Itens |
| --- | --- |
| 1 · Quick wins e segurança | MEL-013, 014, 015, 016, 018, 007, 001, 003, 002, 010, 004, 017 + Analytics |
| 2 · Redesign estrutural | MEL-005, 006, 012, 011, 008, 009 |
| 3 · Funcionalidades | MEL-019, 025, 022 |
| 4 · Inovação | MEL-023, 024 |

Referência visual: canvas "Cris du Corte — Direções", telas **✔ Escolhida**, **Admin · Mensalistas** e **Admin · Novo mensalista** (prints enviados junto com os prompts 14 e 18).

Pendências: logo em PNG sem fundo; revisão jurídica da Política de Privacidade; conferir no código se a grade atual já é a acima.

## 2. Design tokens (MEL-002, MEL-005, MEL-006)

Os tokens substituem as variáveis atuais de `app/globals.css`, mantendo os nomes do shadcn para não quebrar componentes. HSL com uma casa decimal: com números inteiros sete cores arredondavam para outro HEX (corrigido no Prompt 10). Todo texto passa em contraste 4,5:1 sobre `--background` e `--card`.

| Token | HEX | Uso |
| --- | --- | --- |
| background | #15161A | Fundo da página |
| card | #1A1C21 | Cards, menu lateral |
| surface-2 | #22232A | Fundo de imagem, skeleton |
| border | #2E3038 | Bordas sólidas |
| foreground | #F4F4F5 | Texto principal |
| muted-foreground | #A1A1AA | Texto secundário (~7:1) |
| disabled | #71717A | Horário ocupado (decorativo + riscado) |
| primary | #7354F5 | Botões com texto branco (~4,9:1) |
| accent | #8162FF | Ícones, bordas, brilho, selecionado |
| accent-soft | #B7A6FF | Texto roxo sobre fundo escuro |
| warning | #FBBF24 | Avisos de conflito e renovação |
| destructive | #EF4444 | Excluir, cancelar |

**app/globals.css**

```css
@layer base {
  :root {
    --background: 228 10.6% 9.2%;  /* #15161A */
    --card: 222.9 11.9% 11.6%;     /* #1A1C21 */
    --surface-2: 233 10% 15%;      /* #22232A */
    --popover: 222.9 11.9% 11.6%;
    --foreground: 240 5% 96%;      /* #F4F4F5 */
    --card-foreground: 240 5% 96%;
    --popover-foreground: 240 5% 96%;
    --primary: 251.6 89% 64.5%;    /* #7354F5 */
    --primary-foreground: 0 0% 100%;
    --accent: 251.8 100% 69.2%;    /* #8162FF */
    --accent-soft: 251.5 100% 82.5%; /* #B7A6FF */
    --accent-foreground: 240 5% 96%;
    --secondary: 233 10% 15%;
    --secondary-foreground: 240 5% 96%;
    --muted: 230 9% 20%;
    --muted-foreground: 240 5% 65%; /* #A1A1AA */
    --disabled: 240 4% 46%;        /* #71717A */
    --border: 230 10% 20%;         /* #2E3038 */
    --input: 230 10% 20%;
    --ring: 251.8 100% 69.2%;
    --warning: 43.3 96.4% 56.3%;   /* #FBBF24 */
    --destructive: 0 84.2% 60.2%;  /* #EF4444 */
    --destructive-foreground: 0 0% 100%;

    --radius: 0.75rem;             /* 12px */
    --radius-sm: 0.625rem;         /* 10px: chips de horário */
    --radius-lg: 1rem;             /* 16px: cards */
    --radius-xl: 1.25rem;          /* 20px: card principal */

    --glass-bg: rgba(26, 28, 33, 0.72);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glow-border: rgba(129, 98, 255, 0.32);
    --shadow-glow: 0 10px 40px rgba(129, 98, 255, 0.16);
    --shadow-selected: 0 0 20px rgba(129, 98, 255, 0.22);

    --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --dur-fast: 150ms;
    --dur-base: 200ms;
    --dur-slow: 300ms;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Versão leve do vidro (MEL-006) */
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: hsl(var(--card)); }
}
```

**tailwind.config.ts (trecho de theme.extend)**

```ts
fontFamily: {
  sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
  brand: ["var(--font-permanent-marker)", "cursive"],
},
fontSize: {
  caption: ["0.75rem", { lineHeight: "1rem" }],        // 12px
  label: ["0.8125rem", { lineHeight: "1.125rem", letterSpacing: "0.06em" }], // 13px caixa alta
  body: ["0.9375rem", { lineHeight: "1.4rem" }],        // 15px
  title: ["1.125rem", { lineHeight: "1.5rem" }],        // 18px
  display: ["1.625rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }], // 26px
},
colors: {
  surface2: "hsl(var(--surface-2))",
  "accent-soft": "hsl(var(--accent-soft))",
  disabled: "hsl(var(--disabled))",
  warning: "hsl(var(--warning))",
},
borderRadius: {
  sm: "var(--radius-sm)",
  DEFAULT: "var(--radius)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
},
boxShadow: {
  glow: "var(--shadow-glow)",
  selected: "var(--shadow-selected)",
},
spacing: { tap: "2.75rem" }, // 44px: alvo de toque mínimo
transitionTimingFunction: { out: "var(--ease-out)" },
```

**app/layout.tsx (fontes)**

```ts
import { Space_Grotesk, Permanent_Marker } from "next/font/google";
const sans = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const brand = Permanent_Marker({ subsets: ["latin"], weight: "400", variable: "--font-permanent-marker", display: "swap" });
// <body className={`dark ${sans.variable} ${brand.variable} font-sans`}>
```

**Espaçamento:** escala Tailwind padrão (4px). Margem lateral da página 20px (`px-5`), espaço entre seções 16–20px, entre itens de grade 6–8px. Container `max-w-md mx-auto` no mobile e `max-w-3xl` a partir de 1024px.

**Motion:** troca de dia = fade + subida de 4px nos horários (200ms, `ease-out`, 20ms de atraso entre itens); confirmação = check animado (300ms); nada passa de 300ms; tudo desliga com reduzir movimento.

## 3. Componentes e estados

Todos os componentes ficam em `app/_components/` e usam só os tokens da seção 2. Alvo de toque mínimo 44 × 44px, foco visível com anel `ring-2 ring-accent ring-offset-2 ring-offset-background`.

| Componente | Item | Padrão | Selecionado / ativo | Desabilitado | Outros estados |
| --- | --- | --- | --- | --- | --- |
| **DayChip** (Sex / Sáb) | MEL-008 | 60px, borda glass, "Sex 16" + "8 horários livres" | Borda #8162FF, fundo roxo 18%, `shadow-selected`, `aria-pressed=true` | Dia lotado: "Lotado", ainda clicável para ver a grade | Skeleton: bloco surface-2 piscando |
| **TimeSlot** | MEL-008, 010 | 44px, grade de 4 colunas, borda glass | Fundo #7354F5, texto branco, `aria-pressed=true` | Ocupado ou bloqueado: borda tracejada, #71717A, riscado, `disabled`, `aria-label="10:30, ocupado"` | Horário passado no dia atual: não aparece |
| **BookingCTA** | MEL-008 | 52px, #7354F5, "Escolha um horário" (desabilitado) | "Reservar Sex 16 às 10:30 →" | Sem horário escolhido | Enviando: spinner + "Reservando…"; erro: toast específico (seção 4) |
| **ShopCard** | MEL-001, 003 | Horizontal: logo 72px raio 14 + nome, endereço, etiqueta "Sex e Sáb" | — | — | Imagem carregando: surface-2 |
| **NextBookingCard** | MEL-008 | Data em bloco roxo + serviço + "às 14:30 · Confirmado" | — | — | Sem reserva: seção some; deslogado: some |
| **SideMenu** | MEL-011 | Botão 44px com `aria-label="Abrir menu"`; itens Início, Meus agendamentos, Admin (só `isAdmin`), Privacidade, Sair | Item atual com `aria-current=page` e cor accent-soft | — | Foco preso no menu aberto; Esc fecha; "Sair" é o próprio `<button>` |
| **EmptyState** | MEL-012 | Ícone + título + texto + ação | — | — | Ex.: "Todos os horários de sexta já foram reservados. Que tal sábado?" [Ver sábado] |
| **ErrorState** | MEL-012 | Card com borda destructive 40% + "Tentar de novo" | — | — | Mensagens por código (seção 4) |
| **Skeleton** | MEL-012 | Blocos surface-2 com pulso de 1,5s | — | — | Sem pulso com reduzir movimento |
| **MensalistaCard** | MEL-025 | Nome, WhatsApp, etiqueta do horário fixo, barra de 4 segmentos "2 de 4", ciclo "03/10 → 25/10" | — | Pausado: borda tracejada, texto muted, botão "Reativar" | Sem horário fixo: botão "Reservar horário na mão" |
| **RenewalAlert** | MEL-025 | Card warning: "[Nome] · ciclo terminou. Usou 4 de 4 · 15/09 → 11/10. Renovar mensalista?" + [Renovar (OK)] [Excluir] | — | — | Excluir abre AlertDialog de confirmação |
| **ConflictWarning** | MEL-025, 019 | Faixa warning `role=status`: "Sex 23 às 12:30 já tem reserva de um cliente. Essa semana não será sobrescrita." | — | — | — |
| **AdminTabs** | MEL-019, 025 | Segmentado com 2 abas, Agenda e Mensalistas, 44px | Aba ativa #7354F5 + aria-current=page | — | Badge com número de renovações pendentes |
| **WhatsAppButton** | MEL-022 | Botão secundário na tela de sucesso: "Enviar confirmação no WhatsApp" | — | Sem telefone do Cris configurado (`Barbershop.phone`): oculto | Abre `wa.me` com texto pronto: "Olá, Cris! Reservei {serviço} para {sexta 23/10} às {10:30} pelo app. Endereço: {endereço}." |
| **InstallHint** | MEL-023 | Faixa fechável: Android "Instalar app"; iPhone "Toque em Compartilhar → Adicionar à Tela de Início" | — | Já instalado ou fechado: não aparece | Lembra o fechamento por 30 dias |

Componentes do shadcn mantidos sem mudança de API: Sheet, AlertDialog, Avatar, Sonner, Form, Input, Label.

## 4. Tela a tela

### 4.1 Home `/` (MEL-008, 007, 009, 001, 003)

Substitui busca, "Recomendados" e "Populares". Ordem de cima para baixo, referência: tela ✔ Escolhida.

1. Header: tesoura + "Cris du Corte" (Permanent Marker) à esquerda, botão de menu à direita; link com `aria-label` correto, sem o nome do template antigo.
2. Título "Olá, vamos agendar um corte?" (logado: "Olá, [primeiro nome]!") + "Atendimento às sextas e sábados".
3. ShopCard horizontal com o logo.
4. "Escolha o dia": 2 DayChips (próxima sexta e próximo sábado). Abre selecionado o primeiro dia com horário livre.
5. "Horários livres": 11 TimeSlots em grade 4 colunas; ocupados, bloqueados e de mensalistas aparecem riscados.
6. BookingCTA. Deslogado: o toque salva `{serviço, dia, horário}` em `sessionStorage` e chama `signIn("google", { callbackUrl: "/?resume=1" })`; na volta, a seleção é restaurada e o CTA fica pronto (MEL-009).
7. NextBookingCard (só se houver reserva futura).
8. Rodapé "© {ano atual} Cris du Corte · Privacidade".

Serviço: se houver mais de 1 serviço, o CTA abre o Sheet atual com a lista e o resumo antes de confirmar; com 1 serviço, confirma direto.

### 4.2 Confirmação e erros

| Situação | Mensagem |
| --- | --- |
| Sucesso | "Reservado! Sex 16 às 10:30." + [Adicionar ao calendário] + [Enviar confirmação no WhatsApp] |
| Horário tomado (P2002) | "Esse horário acabou de ser reservado por outra pessoa. Escolha outro." + grade recarregada |
| Sem conexão | "Sem conexão. Verifique a internet e tente de novo." |
| Limite de tentativas (AUD-026) | "Muitas tentativas seguidas. Aguarde 1 minuto." |
| Erro genérico | "Não conseguimos reservar agora. Tente de novo em instantes." |

### 4.3 Meus agendamentos `/bookings` (MEL-015, 012)

Lista "Próximos" e "Anteriores", só do usuário logado. Cancelar continua com AlertDialog. Vazio: "Você ainda não tem horários marcados." [Agendar agora].

### 4.4 Admin · Agenda `/adm` (MEL-019, 014, 011)

Acesso só com `session.user.isAdmin`. AdminTabs no topo. Seletor de dia (próximas 4 sextas e sábados) e a grade de 11 horários do dia com o dono de cada um:

| Estado do horário | Aparece como | Ações |
| --- | --- | --- |
| Livre | "Livre" | Reservar na mão · Bloquear |
| Cliente | Nome + serviço | Cancelar |
| Mensalista | Nome + "Mensalista" | Desmarcar esta semana (conta como usado) |
| Bloqueado | "Bloqueado" + motivo | Desbloquear |

Botão "Bloquear dia inteiro" no topo do dia (folga ou feriado); só bloqueia horários livres e lista os ocupados para o Cris resolver. Reserva manual pede nome e WhatsApp, sem conta Google.

### 4.5 Admin · Mensalistas `/adm/mensalistas` (MEL-025)

Referência: tela Admin · Mensalistas. Ordem: RenewalAlerts no topo, depois ativos (por próximo atendimento), depois pausados. Botão [+ Novo].

### 4.6 Admin · Novo / editar mensalista (MEL-025)

Referência: tela Admin · Novo mensalista. Campos: nome*, WhatsApp*, e-mail Google (opcional), "Como vai agendar?" = Horário fixo ou Reservar na mão; se fixo: Toda sexta ou Todo sábado + um TimeSlot. Horário fixo de outro mensalista = desabilitado; horário com cliente em alguma semana do ciclo = ponto laranja + ConflictWarning. Data de pagamento (padrão hoje). Salvar gera as reservas do ciclo (seção 5).

### 4.7 Privacidade e perfil (MEL-016)

- `/privacidade`: quem é o controlador, dados coletados (nome, e-mail, foto Google, histórico), finalidade, prazo de guarda, como pedir exclusão, contato. **Revisão jurídica antes de publicar.**
- Login: texto "Ao entrar, você concorda com a [Política de Privacidade]."
- Menu → Perfil → "Excluir minha conta": AlertDialog, cancela reservas futuras e apaga User, Account e Session.

### 4.8 Compartilhamento e instalação (MEL-017, 023)

- `metadata` com `openGraph` (título "Cris du Corte — Agende seu horário", imagem 1200 × 630 com o logo), `twitter`, `robots.ts`, `sitemap.ts` e JSON-LD `HairSalon` com endereço e horário (sex/sáb 09:00–20:30).
- `app/manifest.ts`: name "Cris du Corte", short_name "Cris du Corte", display `standalone`, background e theme #15161A, ícones 192, 512 e maskable a partir do logo.
- "Adicionar ao calendário": arquivo `.ics` gerado na hora (serve para iPhone e Android) + link do Google Agenda.

### 4.9 Notificações por e-mail (MEL-022, Prompt 19)

Canal: Gmail SMTP com conta dedicada da barbearia (sem domínio próprio; Resend exige domínio verificado). Web Push fica para o Prompt 20. WhatsApp só por link `wa.me` (sem API). Textos aprovados pelo dono em 21/10/2026, ajustados no mesmo dia para entregabilidade (conta remetente nova):

| Evento | Para | Assunto |
| --- | --- | --- |
| Cliente reservou | Cliente | "Sua reserva com o Cris — sex 23/10 às 09:00" |
| Cliente reservou | Cris (todos os `isAdmin`) | "Nova reserva: João — sex 23/10 às 09:00" |
| Cliente cancelou | Cris | "Cancelamento: João — sex 23/10 às 09:00" |
| Cris cancelou | Cliente | "Sua reserva de sex 23/10 às 09:00 foi cancelada pelo Cris" |
| Véspera (Cron qui e sex, 20h) | Cliente | "Amanhã às 09:00 com o Cris — sex 23/10" + "Ver ou cancelar a reserva" + "Não quero mais lembretes" |
| Último fim de semana do ciclo | Cris | "Renovar mensalistas: Pedro, Ana" (1x por ciclo) |

Regras de entregabilidade: multipart (texto puro + HTML leve, sem imagens); assunto sem "!"; no máximo 2 links por e-mail, sempre com texto (sem URL nua no HTML); `Reply-To` = e-mails dos `User.isAdmin` nos e-mails ao cliente; `List-Unsubscribe` (+ one-click) só no lembrete. Rodapé ao cliente: "Cris du Corte · {endereço} · Dúvidas? Responda este e-mail ou chame o Cris no WhatsApp: {(31) 9xxxx-xxxx}" (o número é link só quando o e-mail ainda tem espaço no limite; no lembrete vai como texto). Rodapé ao Cris: "Aviso automático do app de agendamento."

Cartão de sucesso da reserva (home nova), com a flag ligada para o usuário: "Enviamos a confirmação para o seu e-mail. Se não encontrar, olhe no Spam e marque 'Não é spam'." + WhatsAppButton (se houver telefone).

Sem e-mail: reserva manual, reserva feita pelo próprio Cris, Pausar/Excluir mensalista. Opt-out ("Lembretes por e-mail" no Perfil ou link do e-mail) desliga **só o lembrete**; confirmação e "o Cris cancelou" sempre saem. Reserva feita depois do Cron da véspera não tem lembrete (a confirmação cumpre o papel).

## 5. Banco de dados e regras

As mudanças são só aditivas (novas tabelas e colunas opcionais), então nenhuma reserva atual é alterada. Conferir antes o `@@unique` atual de `Booking` no `schema.prisma`: ele deve garantir **uma reserva por data e hora**.

```prisma
enum BookingSource {
  CLIENT      // cliente pelo app
  MANUAL      // Cris pelo painel
  MENSALISTA  // gerada pelo horário fixo
}

model Booking {
  // campos atuais mantidos
  userId        String?        // passa a ser opcional (reserva manual sem conta)
  customerName  String?
  customerPhone String?
  source        BookingSource  @default(CLIENT)
  mensalistaId  String?
  mensalista    Mensalista?    @relation(fields: [mensalistaId], references: [id])
  cycleId       String?
  cycle         MensalistaCycle? @relation(fields: [cycleId], references: [id])
}

model SlotBlock {               // MEL-019
  id        String   @id @default(cuid())
  date      DateTime            // data + hora do horário bloqueado (UTC)
  reason    String?
  createdAt DateTime @default(now())
  @@unique([date])
}

enum MensalistaStatus { ATIVO PAUSADO EXCLUIDO }

model Mensalista {              // MEL-025
  id         String   @id @default(cuid())
  name       String
  phone      String
  email      String?             // liga ao User pelo e-mail, se existir
  fixedDay   Int?                // 5 = sexta, 6 = sábado; null = reserva na mão
  fixedTime  String?             // "10:30"
  status     MensalistaStatus @default(ATIVO)
  cycles     MensalistaCycle[]
  bookings   Booking[]
  createdAt  DateTime @default(now())
}

model MensalistaCycle {
  id           String   @id @default(cuid())
  mensalistaId String
  mensalista   Mensalista @relation(fields: [mensalistaId], references: [id])
  paidAt       DateTime            // início do ciclo
  weekends     DateTime[]          // as 4 sextas de referência do ciclo
  endsAt       DateTime            // domingo após o 4º fim de semana
  renewedAt    DateTime?
  bookings     Booking[]
}
```

**Disponibilidade de um horário** = está na grade fixa **e** não tem `Booking` ativo **e** não tem `SlotBlock`. A mesma função serve à home, ao painel e ao cadastro de mensalista.

**Regras do ciclo do mensalista**

1. Ao registrar o pagamento: `paidAt` = agora; o 1º fim de semana é o primeiro cujo horário fixo ainda está por vir. Renovar só no último fim de semana ou depois de vencido, começando depois do último fim de semana do ciclo anterior. "Ciclo já em andamento": gera só os N fins de semana restantes (1–4). *(Prompt 18.)*
2. Com horário fixo: em uma transação, criar 1 `Booking` (`source = MENSALISTA`) por fim de semana no dia e hora fixos. Se algum horário estiver ocupado ou bloqueado, **não grava nada** (tudo ou nada) e devolve a lista de conflitos para o ConflictWarning. *(Decisão do dono em 19/10/2026, Prompt 18.)*
3. Sem horário fixo: o Cris reserva cada fim de semana na mão; o painel só permite 1 reserva de mensalista por fim de semana do ciclo.
4. Uso: cada fim de semana do ciclo que já passou conta como usado, tendo ido ou faltado (o ciclo não estende). Contador "x de 4" = fim de semana atual ou próximo, contando os que já tinham passado antes do cadastro (2 restantes → "3 de 4"). *(Prompt 18.)*
5. Fim do ciclo: quando hoje > `endsAt` e `renewedAt` vazio, o mensalista entra em RenewalAlert. Renovar = novo ciclo com `paidAt` = data informada (padrão hoje). Excluir = `status = EXCLUIDO` e cancela as reservas futuras.
6. Pausar = `status = PAUSADO`, cancela as reservas futuras de mensalista e libera os horários.

**Autorização (MEL-014, 015, AUD-016, AUD-026)**

- `isAdmin` no callback de sessão do NextAuth, lido do banco; nenhum e-mail ou id no código. O login continua sendo a conta Google do Cris.
- Migração de dados: `UPDATE "User" SET "isAdmin" = true WHERE email = '<e-mail do Cris>'`.
- `getUserBookings` vira `findMany({ where: { userId: session.user.id } })`; a função `redirectSpecialBookings` é removida.
- Toda server action de admin começa com `assertAdmin(session)`; as de cliente com `assertUser(session)`.
- Rate limit simples por usuário em `saveBooking` e `cancelBooking` (ex.: 10 por minuto).

## 6. Plano de migração sem quebrar o que está no ar

Toda mudança é testada em localhost, passa nos testes automáticos e, quando muda o que o cliente vê, fica atrás de uma feature flag que volta atrás sem novo deploy.

**Fluxo de cada entrega**

1. Branch → implementação → teste em localhost (`npm run dev`).
2. Testes (MEL-018) rodam a cada PR: reservar, cancelar, dois clientes no mesmo horário, acesso de admin, dias liberados num domingo. Teste vermelho bloqueia o merge.
3. Commit (só depois do teste) → Pull Request → preview da Vercel como conferência final.
4. Merge na `main` → produção. Migrações do Prisma rodam com `prisma migrate deploy` no build, sempre aditivas.
5. Rollback: "Promote" do deploy anterior na Vercel (1 clique); flags desligam o recurso na hora.

**Feature flags** (variáveis de ambiente na Vercel ou uma tabela `Flag`, lidas no servidor)

| Flag | Controla | Rollout |
| --- | --- | --- |
| `NEW_HOME` | Home nova (MEL-008, 009) | 1) só admin por 7 dias → 2) todos; home antiga fica em `/classic` por 30 dias |
| `NEW_THEME` | Tokens e visual B (MEL-005, 006) | Junto com `NEW_HOME` |
| `ADMIN_PANEL_V2` | Bloqueios e reserva manual (MEL-019) | Só admin desde o início |
| `MENSALISTAS` | Aba Mensalistas (MEL-025) | Só admin; ligar após cadastrar 1 mensalista de teste |
| `NOTIFICACOES` (era `NOTIFY_EMAIL`) | E-mails de confirmação, lembrete da véspera e avisos + botão do WhatsApp (MEL-022, Prompt 19) | Só admin primeiro (`admin`), depois todos (`all`) |
| `PWA_INSTALL` | Dica de instalação (MEL-023) | Todos |

**Cuidados por fase**

| Fase | Risco principal | Proteção |
| --- | --- | --- |
| 1 | Admin perder acesso ao trocar para `isAdmin` | Rodar o `UPDATE` do admin **antes** do deploy; manter o e-mail antigo como fallback por 1 deploy e removê-lo no seguinte |
| 1 | Login cair ao corrigir o nome da chave | Confirmar `NEXTAUTH_SECRET` na Vercel com o mesmo valor da chave atual; sessões continuam válidas |
| 1 | Remover o card "Indisponivel" apagar algo usado | Antes, conferir se há reservas ligadas a ele; se houver, só esconder |
| 2 | Clientes estranharem a home nova | Rollout só para admin primeiro; comparar reservas confirmadas antes e depois |
| 3 | Reserva automática de mensalista sobrescrever cliente | Geração em transação **tudo ou nada**: com conflito não grava e mostra o aviso; teste dedicado |
| 3 | `userId` opcional quebrar telas que assumem usuário | Toda tela usa `customerName ?? user.name`; teste com reserva manual |
| 4 | Service worker deixar versão velha em cache | Sem cache offline das páginas de reserva; só ícones e fontes |

**Medição (plano Hobby da Vercel)**

- Vercel Web Analytics (visitas e páginas) e Speed Insights (velocidade) ligados no dia 1 da Fase 1. Ambos funcionam no Hobby, com cota mensal limitada.
- **Eventos personalizados não são registrados no Hobby** (só Pro/Enterprise). Por isso `app/_lib/track.ts` existe como ponto único: hoje chama o `track` da Vercel (sem efeito no Hobby) e pode ser trocado depois por outra ferramenta, sem mexer no resto do código.
- As métricas de reserva vêm **do próprio banco**: reservas confirmadas, canceladas e por origem (`source`) por semana, contadas por consulta. Isso não depende de plano pago.
- Eventos sem dado no banco (`booking_started`, `login_from_booking`, `booking_failed`) ficam só como chamadas no código até haver uma ferramenta gratuita de eventos, se um dia for preciso.

**Checklist de pronto (por item)**

- [ ] Critério de aceite do MEL cumprido em localhost
- [ ] Testes automáticos verdes
- [ ] Lighthouse de acessibilidade ≥ 90 na tela alterada
- [ ] Testado em Android (Chrome) e iPhone (Safari) depois do deploy
- [ ] Flag e plano de rollback definidos
