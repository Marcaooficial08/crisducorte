import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sendNotification: vi.fn() }));

vi.mock("web-push", () => ({ default: { sendNotification: mocks.sendNotification } }));

import { isAllowedEndpoint, isPushConfigured, sendPush } from "./push";

const TARGET = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "chave", auth: "segredo" };
const PAYLOAD = { title: "Título", body: "Texto", url: "/bookings", tag: "booking-1" };

const httpError = (statusCode: number) => Object.assign(new Error(`HTTP ${statusCode}`), { statusCode });

describe("transporte do Web Push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VAPID_PUBLIC_KEY", "publica");
    vi.stubEnv("VAPID_PRIVATE_KEY", "privada");
    vi.stubEnv("VAPID_SUBJECT", "mailto:barbearia@example.com");
    mocks.sendNotification.mockResolvedValue({ statusCode: 201 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("aceita só endpoints https dos serviços de push conhecidos (sem SSRF)", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc",
      "https://web.push.apple.com/QGx1",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(isAllowedEndpoint(endpoint), endpoint).toBe(true);
    }
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com:8443/fcm/send/abc",
      "https://user:senha@fcm.googleapis.com/fcm/send/abc",
      "https://fcm.googleapis.com.evil.example/abc",
      "https://evilfcm.googleapis.com/abc",
      "https://localhost/abc",
      "https://169.254.169.254/latest/meta-data",
      "https://notify.windows.com.evil.example/abc",
      "nao-e-url",
    ]) {
      expect(isAllowedEndpoint(endpoint), endpoint).toBe(false);
    }
  });

  it("sem as 3 variáveis VAPID não configura nem envia", async () => {
    expect(isPushConfigured()).toBe(true);
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(isPushConfigured()).toBe(false);
    expect((await sendPush(TARGET, PAYLOAD)).status).toBe("FAILED");
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("envia o payload em JSON com VAPID, urgência alta e TTL entre 1 minuto e 24 horas", async () => {
    expect(await sendPush(TARGET, PAYLOAD, 3600)).toEqual({ status: "SENT" });
    const [subscription, body, options] = mocks.sendNotification.mock.calls[0];
    expect(subscription).toEqual({ endpoint: TARGET.endpoint, keys: { p256dh: "chave", auth: "segredo" } });
    expect(JSON.parse(body)).toEqual(PAYLOAD);
    expect(options).toMatchObject({
      vapidDetails: { subject: "mailto:barbearia@example.com", publicKey: "publica", privateKey: "privada" },
      TTL: 3600,
      urgency: "high",
    });

    await sendPush(TARGET, PAYLOAD, 5);
    expect(mocks.sendNotification.mock.calls[1][2].TTL).toBe(60);
    await sendPush(TARGET, PAYLOAD, 10 * 24 * 3600);
    expect(mocks.sendNotification.mock.calls[2][2].TTL).toBe(24 * 3600);
  });

  it("404 e 410 = inscrição vencida (GONE); outros erros = falha passageira", async () => {
    mocks.sendNotification.mockRejectedValueOnce(httpError(410));
    expect(await sendPush(TARGET, PAYLOAD)).toEqual({ status: "GONE" });
    mocks.sendNotification.mockRejectedValueOnce(httpError(404));
    expect(await sendPush(TARGET, PAYLOAD)).toEqual({ status: "GONE" });
    mocks.sendNotification.mockRejectedValueOnce(httpError(500));
    expect((await sendPush(TARGET, PAYLOAD)).status).toBe("FAILED");
    mocks.sendNotification.mockRejectedValueOnce(new Error("ETIMEDOUT"));
    expect((await sendPush(TARGET, PAYLOAD)).status).toBe("FAILED");
  });
});
