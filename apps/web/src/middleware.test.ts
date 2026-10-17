// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { isProtectedPath, middleware, SESSION_COOKIE } from "./middleware"

function request(path: string, cookie?: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : undefined,
  })
}

describe("middleware", () => {
  it("redireciona rota protegida sem cookie para /login?next=...", () => {
    const res = middleware(request("/dashboard"))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get("location")!)
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("next")).toBe("/dashboard")
  })

  it("preserva a query string no parâmetro next", () => {
    const res = middleware(request("/ide?lesson=abc"))
    const location = new URL(res.headers.get("location")!)
    expect(location.searchParams.get("next")).toBe("/ide?lesson=abc")
  })

  it("deixa passar quando o cookie de sessão existe", () => {
    const res = middleware(request("/lesson/123", `${SESSION_COOKIE}=opaque-token`))
    expect(res.headers.get("location")).toBeNull()
    expect(res.headers.get("x-middleware-next")).toBe("1")
  })

  it("não interfere em rotas públicas", () => {
    for (const path of ["/", "/login", "/cursos", "/cursos/abc", "/certificado/XYZ", "/perfil/ana"]) {
      const res = middleware(request(path))
      expect(res.headers.get("location")).toBeNull()
    }
  })

  it("protege a prova do curso, mas não a página do curso", () => {
    expect(isProtectedPath("/cursos/abc/prova")).toBe(true)
    expect(isProtectedPath("/cursos/abc")).toBe(false)
    const res = middleware(request("/cursos/abc/prova"))
    expect(new URL(res.headers.get("location")!).searchParams.get("next")).toBe("/cursos/abc/prova")
  })

  it("só considera prefixos inteiros (/adminx não é /admin)", () => {
    expect(isProtectedPath("/admin")).toBe(true)
    expect(isProtectedPath("/admin/users")).toBe(true)
    expect(isProtectedPath("/adminx")).toBe(false)
    expect(isProtectedPath("/teacher/edit/1")).toBe(true)
    expect(isProtectedPath("/settings")).toBe(true)
    expect(isProtectedPath("/notas")).toBe(true)
  })
})
