import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("/sw.js", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("nunca em cache e com tipo JavaScript", async () => {
    const response = GET();
    expect(response.headers.get("content-type")).toBe("application/javascript; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache, no-store, must-revalidate");
  });

  it("flag off: script que apaga os caches e se remove", async () => {
    vi.stubEnv("PWA_INSTALL", "off");
    const script = await GET().text();
    expect(script).toContain("self.registration.unregister()");
    expect(script).not.toContain('addEventListener("fetch"');
  });

  it("flag admin ou all: SW com a versão do deploy, cache só de assets e nada de páginas", async () => {
    vi.stubEnv("PWA_INSTALL", "admin");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "d2bc8f6abcdef0123456789");
    const script = await GET().text();
    expect(script).toContain('const CACHE = "cdc-static-d2bc8f6abcde";');
    expect(script).toContain("self.skipWaiting()");
    expect(script).toContain("self.clients.claim()");
    expect(script).toContain('url.pathname.startsWith("/_next/static/")');
    expect(script).toContain('request.method !== "GET"');
    expect(script).not.toContain("unregister");
    // Sem modo offline: nada de navegação, RSC ou /api no cache.
    expect(script).not.toMatch(/navigate|_rsc|\/api\//);

    vi.stubEnv("PWA_INSTALL", "all");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    expect(await GET().text()).toContain('const CACHE = "cdc-static-local";');
  });

  it("os dois scripts são JavaScript válido (só compila, não executa)", async () => {
    for (const mode of ["all", "off"]) {
      vi.stubEnv("PWA_INSTALL", mode);
      const script = await GET().text();
      expect(() => new Function(script)).not.toThrow();
    }
  });
});
