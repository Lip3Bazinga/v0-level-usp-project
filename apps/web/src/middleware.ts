import { NextResponse, type NextRequest } from "next/server"
import { PROTECTED_ROUTE_PREFIXES, ROUTES, SESSION_COOKIE_NAME } from "@/lib/constants"

/*
 * Só decide o redirecionamento: rota protegida sem cookie de sessão vai para o
 * login. O cookie é httpOnly e opaco para o Next, então não é validado aqui; a
 * autorização real acontece na API a cada chamada, e um cookie forjado no
 * máximo vê o esqueleto da página.
 */

const EXAM_ROUTE = /^\/cursos\/[^/]+\/prova(?:\/|$)/

export function isProtectedPath(pathname: string): boolean {
  if (EXAM_ROUTE.test(pathname)) return true
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function middleware(request: NextRequest): NextResponse<unknown> {
  const { pathname, search } = request.nextUrl
  if (!isProtectedPath(pathname)) return NextResponse.next()
  if (request.cookies.get(SESSION_COOKIE_NAME)?.value) return NextResponse.next()

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = ROUTES.login
  loginUrl.search = ""
  loginUrl.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

// O Next exige um `matcher` literal (analisado no build); manter igual a PROTECTED_ROUTE_PREFIXES + prova.
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
