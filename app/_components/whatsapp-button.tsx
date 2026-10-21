import { MessageCircleIcon } from "lucide-react";
import { Button } from "./ui/button";
import { WhatsappConfirmation, whatsappConfirmationUrl } from "@/app/_lib/whatsapp-message";

// WhatsAppButton (MEL-022, spec §3): botão secundário na tela de sucesso. Abre o wa.me do Cris com o
// texto pronto. Quem usa só renderiza quando há telefone cadastrado na barbearia.
const WhatsAppButton = (props: WhatsappConfirmation) => (
  <Button asChild variant="secondary" className="min-h-11 w-full">
    <a href={whatsappConfirmationUrl(props)} target="_blank" rel="noopener noreferrer">
      <MessageCircleIcon className="mr-2 h-5 w-5" aria-hidden="true" />
      Enviar confirmação no WhatsApp
    </a>
  </Button>
);

export default WhatsAppButton;
