import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("@/app/_lib/prisma", () => ({ db: { service: { findUnique: mocks.findUnique } } }));

import { GET } from "./route";

const URL_BASE = "https://crisducorte.vercel.app/api/calendario";
const request = (query: string) => new Request(`${URL_BASE}?${query}`);
const VALID = "data=2026-10-23&hora=10:30&servico=svc-1";

describe("rota do .ics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXTAUTH_URL", "https://staging.example.com");
    mocks.findUnique.mockResolvedValue({ name: "Corte de Cabelo", barbershop: { address: "Rua dos Testes, 1" } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem login também responde: o .ics não tem dado pessoal (Prompt 22, sem a flag CALENDARIO)", async () => {
    expect((await GET(request(VALID))).status).toBe(200);
  });

  it("data inválida, hora fora da grade ou sem serviço: 400 sem ler o banco", async () => {
    for (const query of [
      "data=2026-02-30&hora=10:30&servico=svc-1",
      "data=2026-10-23&hora=10:00&servico=svc-1",
      "data=2026-10-23&hora=10:30",
      `data=2026-10-23&hora=10:30&servico=${"x".repeat(65)}`,
    ]) {
      expect((await GET(request(query))).status).toBe(400);
    }
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("serviço inexistente: 404", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect((await GET(request(VALID))).status).toBe(404);
  });

  it("responde o .ics com o endereço do banco, o horário em UTC e o link da staging", async () => {
    const response = await GET(request(VALID));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('inline; filename="cris-du-corte-2026-10-23.ics"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = (await response.text()).replace(/\r\n /g, "");
    expect(body).toContain("DTSTART:20261023T133000Z\r\n");
    expect(body).toContain("DTEND:20261023T143000Z\r\n");
    expect(body).toContain("LOCATION:Rua dos Testes\\, 1\r\n");
    expect(body).toContain("SUMMARY:Corte de Cabelo · Cris du Corte\r\n");
    expect(body).toContain("https://staging.example.com/bookings");
    expect(mocks.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "svc-1" } }));
  });
});
