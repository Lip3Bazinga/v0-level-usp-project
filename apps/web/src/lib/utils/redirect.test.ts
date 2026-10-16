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

  it("usa o padrão para vazio e para as próprias telas de login/cadastro", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard")
    expect(safeRedirectPath("")).toBe("/dashboard")
    expect(safeRedirectPath("/login?next=/x")).toBe("/dashboard")
    expect(safeRedirectPath(undefined, "/cursos")).toBe("/cursos")
  })
})
