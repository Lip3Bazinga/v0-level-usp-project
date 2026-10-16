import { NextResponse, type NextRequest } from "next/server"

/**
 * Middleware de navegação.
 *
 * Só decide REDIRECIONAMENTO: se a rota é protegida e não há cookie de sessão,
 * manda para /login?next=<rota>. Não valida a sessão (o cookie é httpOnly e
 * opaco para o Next) — a autorização real é feita pela API em cada chamada.
 * Um cookie forjado no máximo vê o "esqueleto" da página.
 */

export const SESSION_COOKIE = "lvl_session"

const PROTECTED_PREFIXES = ["/dashboard", "/lesson", "/ide", "/notas", "/settings", "/teacher", "/admin"]
const EXAM_ROUTE = /^\/cursos\/[^/]+\/prova(?:\/|$)/

export function isProtectedPath(pathname: string): boolean {
  if (EXAM_ROUTE.test(pathname)) return true
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  if (!isProtectedPath(pathname)) return NextResponse.next()
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.search = ""
  url.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/lesson/:path*",
    "/ide/:path*",
    "/notas/:path*",
    "/settings/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/cursos/:id/prova/:path*",
  ],
}
