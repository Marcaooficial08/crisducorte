import { describe, expect, it } from "vitest";
import { pushStatusOf, sameKey, urlBase64ToUint8Array } from "./push-client";

const SUPPORTED = { ios: false, standalone: false, supported: true, permission: "default" as const };

describe("estado do switch de push", () => {
  it("iPhone fora do app instalado pede para instalar, mesmo se o navegador parecer suportar", () => {
    expect(pushStatusOf({ ...SUPPORTED, ios: true })).toBe("ios-install");
    expect(pushStatusOf({ ...SUPPORTED, ios: true, supported: false, permission: "unsupported" })).toBe("ios-install");
  });

  it("iPhone com o app instalado segue como os outros", () => {
    expect(pushStatusOf({ ...SUPPORTED, ios: true, standalone: true })).toBeNull();
    expect(pushStatusOf({ ...SUPPORTED, ios: true, standalone: true, supported: false })).toBe("unsupported");
  });

  it("sem suporte, permissão negada ou liberado (decide pela inscrição)", () => {
    expect(pushStatusOf({ ...SUPPORTED, supported: false, permission: "unsupported" })).toBe("unsupported");
    expect(pushStatusOf({ ...SUPPORTED, permission: "denied" })).toBe("denied");
    expect(pushStatusOf(SUPPORTED)).toBeNull();
    expect(pushStatusOf({ ...SUPPORTED, permission: "granted" })).toBeNull();
  });

  it("chave pública VAPID base64url vira os bytes certos e compara com a da inscrição", () => {
    const bytes = urlBase64ToUint8Array("AQID_-8");
    expect(Array.from(bytes)).toEqual([1, 2, 3, 255, 239]);
    expect(sameKey(new Uint8Array([1, 2, 3, 255, 239]).buffer, bytes)).toBe(true);
    expect(sameKey(new Uint8Array([1, 2, 3]).buffer, bytes)).toBe(false);
    expect(sameKey(null, bytes)).toBe(false);
  });
});
