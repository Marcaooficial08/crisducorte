import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest do PWA", () => {
  it("nome, cores da marca, standalone e ícones any + maskable em 192 e 512", () => {
    const value = manifest();
    expect(value.name).toBe("Cris du Corte");
    expect(value.short_name).toBe("Cris du Corte");
    expect(value.display).toBe("standalone");
    expect(value.start_url).toBe("/");
    expect(value.background_color).toBe("#15161A");
    expect(value.theme_color).toBe("#15161A");
    const icons = (value.icons ?? []).map((icon) => `${icon.purpose} ${icon.sizes} ${icon.src}`);
    expect(icons).toEqual([
      "any 192x192 /icons/icon-192.png",
      "any 512x512 /icons/icon-512.png",
      "maskable 192x192 /icons/maskable-192.png",
      "maskable 512x512 /icons/maskable-512.png",
    ]);
  });
});
