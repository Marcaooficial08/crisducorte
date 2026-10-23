import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runNotificationsCron: vi.fn() }));

vi.mock("@/app/_lib/notifications/notify", () => ({ runNotificationsCron: mocks.runNotificationsCron }));

import { GET } from "./route";

const URL_BASE = "https://crisducorte.vercel.app/api/cron/notificacoes";

const request = (query = "", authorization?: string) =>
  new Request(`${URL_BASE}${query}`, { headers: authorization ? { authorization } : {} });

describe("Cron de notificações", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "segredo-cron");
    vi.stubEnv("NOTIFICACOES", "all");
    vi.stubEnv("VERCEL_ENV", "production");
    mocks.runNotificationsCron.mockResolvedValue({ expired: 0, retried: 0, reminders: {}, renewals: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem Bearer, com Bearer errado ou sem CRON_SECRET: 401 sem rodar nada", async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request("", "Bearer errado"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("", "Bearer "))).status).toBe(401);
    expect(mocks.runNotificationsCron).not.toHaveBeenCalled();
  });

  it("NOTIFICACOES e WEB_PUSH off: responde sem enviar", async () => {
    vi.stubEnv("NOTIFICACOES", "off");
    vi.stubEnv("WEB_PUSH", "off");
    const response = await GET(request("", "Bearer segredo-cron"));
    expect(await response.json()).toEqual({ skipped: "NOTIFICACOES=off e WEB_PUSH=off" });
    expect(mocks.runNotificationsCron).not.toHaveBeenCalled();
  });

  it("só WEB_PUSH ligada: roda (o push do lembrete confere a sua flag)", async () => {
    vi.stubEnv("NOTIFICACOES", "off");
    vi.stubEnv("WEB_PUSH", "admin");
    expect((await GET(request("", "Bearer segredo-cron"))).status).toBe(200);
    expect(mocks.runNotificationsCron).toHaveBeenCalledTimes(1);
  });

  it("autorizado: roda para amanhã (sem dia)", async () => {
    const response = await GET(request("", "Bearer segredo-cron"));
    expect(response.status).toBe(200);
    expect(mocks.runNotificationsCron).toHaveBeenCalledWith(expect.any(Date), undefined);
  });

  it("?dia só fora de produção e no formato yyyy-MM-dd", async () => {
    expect((await GET(request("?dia=2026-10-23", "Bearer segredo-cron"))).status).toBe(400);

    vi.stubEnv("VERCEL_ENV", "preview");
    expect((await GET(request("?dia=23/10", "Bearer segredo-cron"))).status).toBe(400);
    expect((await GET(request("?dia=2026-10-23", "Bearer segredo-cron"))).status).toBe(200);
    expect(mocks.runNotificationsCron).toHaveBeenCalledWith(expect.any(Date), "2026-10-23");
  });

  it("erro inesperado: 500 sem detalhes", async () => {
    mocks.runNotificationsCron.mockRejectedValue(new Error("banco fora"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET(request("", "Bearer segredo-cron"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Erro ao enviar notificações." });
    consoleError.mockRestore();
  });
});
