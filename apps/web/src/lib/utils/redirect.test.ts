import { describe, expect, it } from "vitest"
import { safeRedirectPath } from "./redirect"

describe("safeRedirectPath", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirectPath("/lesson/1?x=2")).toBe("/lesson/1?x=2")
    expect(safeRedirectPath("/cursos/abc/prova")).toBe("/cursos/abc/prova")
  })

  it("recusa URLs externas e protocolos (open redirect)", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard")
    expect(safeRedirectPath("//evil.com/x")).toBe("/dashboard")
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard")
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard")
  })

  it("recusa caminhos que o parser do navegador transforma em outra origem (TAB, quebra de linha, barra invertida)", () => {
    for (const raw of ["/\t/evil.com", "/\n/evil.com", "/\r\n/evil.com", "/\t\\evil.com", "\\/evil.com", "/\\/evil.com"]) {
      expect(safeRedirectPath(raw)).toBe("/dashboard")
      expect(new URL(safeRedirectPath(raw), "https://levelusp.usp.br").origin).toBe("https://levelusp.usp.br")
    }
  })

  it("normaliza o caminho interno aceito", () => {
    expect(safeRedirectPath("/cursos/../dashboard")).toBe("/dashboard")
    expect(safeRedirectPath("/%09/evil.com")).toBe("/%09/evil.com")
    expect(safeRedirectPath("/lesson/1#topo")).toBe("/lesson/1#topo")
  })

  it("usa o padrão para vazio e para as próprias telas de login/cadastro", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard")
    expect(safeRedirectPath("")).toBe("/dashboard")
    expect(safeRedirectPath("/login?next=/x")).toBe("/dashboard")
    expect(safeRedirectPath(undefined, "/cursos")).toBe("/cursos")
  })
})
