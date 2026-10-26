import { describe, expect, it } from "vitest";
import nextConfig, { securityHeaders } from "../next.config.mjs";

// Headers de segurança (Prompt 22): valem para todas as rotas.
describe("headers de segurança", () => {
  it("aplica a lista a todas as rotas", async () => {
    const rules = await nextConfig.headers?.();
    expect(rules).toEqual([{ source: "/:path*", headers: securityHeaders }]);
  });

  it("bloqueia iframe, sniffing e recursos que o app não usa", () => {
    const byKey = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));
    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(byKey["Content-Security-Policy"]).toContain("object-src 'none'");
    // Sem script-src: com nonce, todas as páginas virariam dinâmicas.
    expect(byKey["Content-Security-Policy"]).not.toContain("script-src");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });
});

// Prompt 22 (D1, D2): a página da barbearia e a home antiga redirecionam para a home, permanente.
describe("redirecionamentos", () => {
  it("/barbershop/:id e /classic vão para /", async () => {
    expect(await nextConfig.redirects?.()).toEqual([
      { source: "/barbershop/:id", destination: "/", permanent: true },
      { source: "/classic", destination: "/", permanent: true },
    ]);
  });
});
