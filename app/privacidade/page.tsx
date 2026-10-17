/*
 * ATENÇÃO: este texto deve passar por revisão jurídica (advogado) antes de ser divulgado.
 */
import Link from "next/link";
import type { Metadata } from "next";
import Header from "../_components/header";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

const CONTROLLER = "Cris du Corte";
const WHATSAPP_LABEL = "WhatsApp (31) 97357-6347";
const WHATSAPP_URL = "https://wa.me/5531973576347";
const LAST_UPDATED = "16/10/2026";

const WhatsAppLink = () => (
  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="underline text-foreground">
    {WHATSAPP_LABEL}
  </a>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2">
    <h2 className="text-title font-bold">{title}</h2>
    <div className="flex flex-col gap-2 text-body text-gray-300 leading-relaxed">{children}</div>
  </section>
);

const PrivacyPage = () => {
  return (
    <>
      <Header />

      <div className="px-page py-6 flex flex-col gap-6 max-w-2xl">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-bold">Política de Privacidade</h1>
          <p className="text-caption text-muted-foreground">Última atualização: {LAST_UPDATED}</p>
        </div>

        <p className="text-body text-gray-300 leading-relaxed">
          Esta política explica, em linguagem simples, quais dados o app de agendamento da barbearia Cris du Corte
          usa, para quê e como você pode pedir que eles sejam apagados, conforme a Lei Geral de Proteção de Dados
          (LGPD — Lei nº 13.709/2018).
        </p>

        <Section title="1. Quem cuida dos seus dados">
          <p>Responsável (controlador): {CONTROLLER}</p>
          <p>
            Contato sobre dados pessoais: <WhatsAppLink />
          </p>
        </Section>

        <Section title="2. Quais dados usamos">
          <p>Quando você entra com a sua conta Google, recebemos:</p>
          <ul className="list-disc pl-5">
            <li>nome;</li>
            <li>e-mail;</li>
            <li>foto do perfil do Google.</li>
          </ul>
          <p>Quando você agenda, guardamos o histórico de reservas: serviço, data e horário.</p>
          <p>Não pedimos CPF, endereço nem dados de pagamento.</p>
        </Section>

        <Section title="3. Para que usamos">
          <ul className="list-disc pl-5">
            <li>identificar você no login;</li>
            <li>registrar, mostrar e cancelar os seus agendamentos;</li>
            <li>permitir que a barbearia saiba quem vem em cada horário;</li>
            <li>ver números gerais de uso (quantos agendamentos por semana), sem identificar ninguém.</li>
          </ul>
          <p>Não vendemos seus dados nem os usamos para propaganda.</p>
        </Section>

        <Section title="4. Base legal">
          <p>
            Usamos os dados para executar o serviço que você pediu, o agendamento (art. 7º, V, da LGPD), e, para os
            números gerais de uso, no legítimo interesse da barbearia em organizar a agenda (art. 7º, IX).
          </p>
        </Section>

        <Section title="5. Com quem os dados são compartilhados">
          <p>
            Só com os serviços necessários para o app funcionar: o Google (login), a empresa que hospeda o site e a
            empresa que guarda o banco de dados. Eles só podem usar os dados para prestar esse serviço.
          </p>
        </Section>

        <Section title="6. Por quanto tempo guardamos">
          <ul className="list-disc pl-5">
            <li>Nome, e-mail e foto: enquanto a sua conta existir.</li>
            <li>
              Reservas passadas: ficam no histórico da barbearia. Se você excluir a conta, elas deixam de ter qualquer
              ligação com você (ficam sem nome, e-mail ou foto).
            </li>
            <li>Reservas futuras: são canceladas quando você exclui a conta.</li>
          </ul>
        </Section>

        <Section title="7. Seus direitos">
          <p>Você pode, a qualquer momento:</p>
          <ul className="list-disc pl-5">
            <li>saber se usamos seus dados e quais são;</li>
            <li>corrigir dados errados (nome e foto vêm da sua conta Google);</li>
            <li>pedir a exclusão dos seus dados;</li>
            <li>tirar dúvidas sobre esta política.</li>
          </ul>
        </Section>

        <Section title="8. Como excluir sua conta">
          <p>
            Pelo próprio app: abra o menu, toque em{" "}
            <Link href="/perfil" className="underline text-foreground">
              Perfil
            </Link>{" "}
            e depois em &quot;Excluir minha conta&quot;. Na hora, suas reservas futuras são canceladas e seu nome,
            e-mail e foto são apagados.
          </p>
          <p>
            Se preferir, peça pelo <WhatsAppLink />.
          </p>
        </Section>

        <Section title="9. Mudanças nesta política">
          <p>Se esta política mudar, a data no topo desta página será atualizada.</p>
        </Section>
      </div>
    </>
  );
};

export default PrivacyPage;
