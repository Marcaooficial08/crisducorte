import { describe, expect, it } from "vitest";
import { failedBeforeMessage } from "./smtp-errors";
import { TransportNotConfiguredError } from "./transport";

const smtpError = (props: { command?: string; code?: string }) => Object.assign(new Error("falha"), props);

describe("failedBeforeMessage: reenviar só sem risco de duplicar", () => {
  it.each([
    ["timeout na conexão", { code: "ETIMEDOUT", command: "CONN" }],
    ["login recusado", { code: "EAUTH", command: "AUTH PLAIN" }],
    ["remetente recusado", { code: "EENVELOPE", command: "MAIL FROM" }],
    ["destinatário recusado (421)", { code: "EENVELOPE", command: "RCPT TO" }],
    ["conexão recusada sem comando", { code: "ECONNECTION" }],
    ["DNS", { code: "EDNS" }],
  ])("%s: pode reenviar", (_label, props) => {
    expect(failedBeforeMessage(smtpError(props))).toBe(true);
  });

  it("SMTP não configurado: nada saiu, pode reenviar", () => {
    expect(failedBeforeMessage(new TransportNotConfiguredError())).toBe(true);
  });

  it.each([
    ["timeout esperando o 250 depois do DATA", { code: "ETIMEDOUT", command: "DATA" }],
    ["conexão caiu durante a mensagem", { code: "ESOCKET", command: "DATA" }],
    ["erro do servidor no fim da mensagem", { code: "EMESSAGE", command: "DATA" }],
    ["timeout sem comando", { code: "ETIMEDOUT" }],
    ["socket sem comando", { code: "ESOCKET" }],
  ])("%s: talvez entregue, não reenvia", (_label, props) => {
    expect(failedBeforeMessage(smtpError(props))).toBe(false);
  });

  it("erro sem informação do SMTP não é reenviado", () => {
    expect(failedBeforeMessage(new Error("algo"))).toBe(false);
    expect(failedBeforeMessage("texto")).toBe(false);
    expect(failedBeforeMessage(null)).toBe(false);
  });
});
