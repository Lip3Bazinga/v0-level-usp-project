import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Rotas de API cuidam da própria autenticação (Bearer JWT) e devem
  // responder 401 em JSON — nunca redirecionar para /login.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return supabaseResponse
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/sobre",
    "/metodologia",
    "/trilhas",
    "/impacto",
    "/equipe",
    "/parceiros",
    "/faq",
    "/contato",
  ]
  const publicPrefixes = ["/lesson/", "/cursos/", "/certificado/"]
  const isPublicRoute =
    publicRoutes.some((route) => request.nextUrl.pathname === route) ||
    publicPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix))

  // If user is not logged in and trying to access a protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirect", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // If user is logged in and trying to access the landing page only, redirect to dashboard.
  // /login and /signup are intentionally left open so that signOut() navigation lands correctly.
  if (user && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // Role-based access control for admin and teacher routes
  if (user && (request.nextUrl.pathname.startsWith("/admin") || request.nextUrl.pathname.startsWith("/teacher"))) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // Se a query falhou (ex: erro de banco, RLS), deixa passar — o client-side
    // vai lidar com o acesso. Redirecionar em caso de erro mascararia o problema
    // e causaria loops de redirect.
    if (profileError || !profile) {
      return supabaseResponse
    }

    const role = profile.role

    if (request.nextUrl.pathname.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    if (request.nextUrl.pathname.