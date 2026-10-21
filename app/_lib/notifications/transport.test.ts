import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createTransport: vi.fn(), sendMail: vi.fn() }));

vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));

import { TransportNotConfiguredError, isTransportConfigured, sendEmail } from "./transport";

const message = { to: "cliente@example.com", subject: "Assunto", text: "Texto", html: "<p>Texto</p>" };

describe("transport (Gmail SMTP)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
    mocks.sendMail.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem SMTP_USER/SMTP_PASS não envia", async () => {
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    expect(isTransportConfigured()).toBe(false);
    await expect(sendEmail(message)).rejects.toBeInstanceOf(TransportNotConfiguredError);
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });

  it("envia pelo Gmail com o nome da barbearia; senha de app sem os espaços", async () => {
    vi.stubEnv("SMTP_USER", "agenda.teste@gmail.com");
    vi.stubEnv("SMTP_PASS", "abcd efgh ijkl mnop");

    await sendEmail({ ...message, headers: { "List-Unsubscribe": "<https://x.test>" } });

    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ service: "gmail", auth: { user: "agenda.teste@gmail.com", pass: "abcdefghijklmnop" } }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith({
      from: { name: "Cris du Corte", address: "agenda.teste@gmail.com" },
      ...message,
      headers: { "List-Unsubscribe": "<https://x.test>" },
    });
  });
});
