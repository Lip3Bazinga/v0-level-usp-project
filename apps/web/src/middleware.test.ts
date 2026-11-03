// @vitest-environment node
import { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"
import { PROTECTED_ROUTE_PREFIXES, SESSION_COOKIE_NAME } from "@/lib/constants"
import { config, isProtectedPath, middleware } from "./middleware"

function buildRequest(path: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    ...(cookie && { headers: { cookie } }),
  })
}

describe("middleware", () => {
  it("redireciona rota protegida sem cookie para /login?next=...", () => {
    const response = middleware(buildRequest("/dashboard"))
    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location") ?? "")
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("next")).toBe("/dashboard")
  })

  it("preserva a query string no parâmetro next", () => {
    const response = middleware(buildRequest("/ide?lesson=abc"))
    const location = new URL(response.headers.get("location") ?? "")
    expect(location.searchParams.get("next")).toBe("/ide?lesson=abc")
  })

  it("deixa passar quando o cookie de sessão existe", () => {
    const response = middleware(buildRequest("/lesson/123", `${SESSION_COOKIE_NAME}=opaque-token`))
    expect(response.headers.get("location")).toBeNull()
    expect(response.headers.get("x-middleware-next")).toBe("1")
  })

  it("não interfere em rotas públicas", () => {
    for (const path of ["/", "/login", "/cursos", "/cursos/abc", "/certificado/XYZ", "/perfil/ana"]) {
      const response = middleware(buildRequest(path))
      expect(response.headers.get("location")).toBeNull()
    }
  })

  it("protege a prova do curso, mas não a página do curso", () => {
    expect(isProtectedPath("/cursos/abc/prova")).toBe(true)
    expect(isProtectedPath("/cursos/abc")).toBe(false)
    const response = middleware(buildRequest("/cursos/abc/prova"))
    expect(new URL(response.headers.get("location") ?? "").searchParams.get("next")).toBe("/cursos/abc/prova")
  })

  it("só considera prefixos inteiros (/adminx não é /admin)", () => {
    expect(isProtectedPath("/admin")).toBe(true)
    expect(isProtectedPath("/admin/users")).toBe(true)
    expect(isProtectedPath("/adminx")).toBe(false)
    expect(isProtectedPath("/teacher/edit/1")).toBe(true)
    expect(isProtectedPath("/settings")).toBe(true)
    expect(isProtectedPath("/notas")).toBe(true)
  })

  it("o matcher literal cobre todos os prefixos protegidos", () => {
    for (const prefix of PROTECTED_ROUTE_PREFIXES) expect(config.matcher).toContain(`${prefix}/:path*`)
  })
})
