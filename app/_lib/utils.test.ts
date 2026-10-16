import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("mantém o tamanho da escala ao lado de uma cor", () => {
    expect(cn("text-body", "text-muted-foreground")).toBe("text-body text-muted-foreground")
  })

  it("o último tamanho da escala vence", () => {
    expect(cn("text-body", "text-caption")).toBe("text-caption")
  })

  it("px-page conflita com outro padding horizontal", () => {
    expect(cn("px-page", "px-3")).toBe("px-3")
  })
})
