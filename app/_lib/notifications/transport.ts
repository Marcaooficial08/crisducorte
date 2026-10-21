import nodemailer, { Transporter } from "nodemailer";

// Ponto único de envio (Prompt 19): Gmail SMTP com a conta dedicada da barbearia.
// Nos testes este módulo é mockado; nada sai de verdade.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
  replyTo?: string[]; // e-mails do Cris (User.isAdmin): a resposta do cliente vai para ele
}

export class TransportNotConfiguredError extends Error {
  constructor() {
    super("SMTP não configurado (SMTP_USER/SMTP_PASS).");
  }
}

const FROM_NAME = "Cris du Corte";

let transporter: Transporter | null = null;
let transporterUser: string | null = null;

const credentials = () => {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s/g, ""); // senha de app vem em blocos com espaço
  return user && pass ? { user, pass } : null;
};

export const isTransportConfigured = (): boolean => credentials() !== null;

const getTransporter = (): { transporter: Transporter; user: string } => {
  const auth = credentials();
  if (!auth) {
    throw new TransportNotConfiguredError();
  }
  if (!transporter || transporterUser !== auth.user) {
    // pool: reaproveita a conexão quando o Cron envia vários lembretes seguidos.
    transporter = nodemailer.createTransport({
      service: "gmail",
      pool: true,
      maxConnections: 1,
      auth,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    transporterUser = auth.user;
  }
  return { transporter, user: auth.user };
};

export const sendEmail = async (message: EmailMessage): Promise<void> => {
  const { transporter: smtp, user } = getTransporter();
  await smtp.sendMail({
    from: { name: FROM_NAME, address: user },
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: message.headers,
    replyTo: message.replyTo && message.replyTo.length > 0 ? message.replyTo : undefined,
  });
};
