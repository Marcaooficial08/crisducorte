// Quando dá para tentar de novo sem risco de e-mail duplicado (Prompt 22).
// O nodemailer marca o erro com o comando SMTP em que falhou (`command`) e um código (`code`).
// Só é seguro reenviar se a falha foi ANTES do corpo da mensagem (conexão, login, remetente,
// destinatário). Falha durante ou depois do DATA (ex.: timeout esperando o "250 OK") pode ter
// entregado o e-mail: vira FAILED final. Erro sem essas informações também não é reenviado.

const BEFORE_MESSAGE_COMMANDS = /^(CONN|EHLO|HELO|LHLO|STARTTLS|AUTH( .*)?|MAIL FROM|RCPT TO)$/i;

// Códigos do nodemailer que só acontecem antes de mandar a mensagem.
const BEFORE_MESSAGE_CODES = new Set(["EAUTH", "ENOAUTH", "ECONNECTION", "EDNS", "ETLS", "EENVELOPE"]);

export const failedBeforeMessage = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  // Sem SMTP_USER/SMTP_PASS nada saiu. Pelo nome (sem importar o transport, mockado nos testes).
  if ((error as { name?: unknown }).name === "TransportNotConfiguredError") {
    return true;
  }
  const { command, code } = error as { command?: unknown; code?: unknown };
  if (typeof command === "string") {
    return BEFORE_MESSAGE_COMMANDS.test(command.trim());
  }
  return typeof code === "string" && BEFORE_MESSAGE_CODES.has(code);
};
