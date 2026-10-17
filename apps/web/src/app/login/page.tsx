"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { LevelButton } from "@/components/design-system/level-button"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { Rocket, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { StreakAnimation } from "@/components/gamification/streak-animation"
import { safeRedirectPath } from "@/lib/utils/redirect"

function LoginForm() {
  const searchParams = useSearchParams()
  // `next` é o parâmetro do middleware novo; `redirect` mantém links antigos.
  const redirect = safeRedirectPath(searchParams.get("next") ?? searchParams.get("redirect"))
  const { signIn } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Streak animation state
  const [showStreak, setShowStreak] = useState(false)
  const [streakDays, setStreakDays] = useState(0)
  const [pendingRedirect, setPendingRedirect] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { error, streakResult } = await signIn(email, password)

    if (error) {
      setError(error)
      setLoading(false)
      return
    }

    // Show streak animation if the user extended their streak today
    if (streakResult?.streakUpdated && streakResult.newStreak > 0) {
      setStreakDays(streakResult.newStreak)
      setPendingRedirect(redirect)
      setShowStreak(true)
      setLoading(false)
      return
    }

    window.location.href = redirect
  }

  const handleStreakClose = () => {
    setShowStreak(false)
    window.location.href = pendingRedirect
  }

  return (
    <>
      <StreakAnimation
        show={showStreak}
        streakDays={streakDays}
        isNewStreak
        onClose={handleStreakClose}
      />

      <div className="flex min-h-screen">
        {/* Left side — Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-level-purple to-level-purple-dark items-center justify-center p-12">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <Rocket className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">LevelUSP</h1>
            <p className="text-lg text-purple-200 leading-relaxed">
              Aprenda programação de forma gamificada. Uma iniciativa gratuita da
              Universidade de São Paulo para todo o Brasil.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-white">50K+</div>
                <div className="text-sm text-purple-200">Estudantes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">200+</div>
                <div className="text-sm text-purple-200">Lições</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">15</div>
                <div className="text-sm text-purple-200">Trilhas</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side — Login Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-level-purple-dark">LevelUSP</span>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-level-purple-dark">Bem-vindo de volta!</h2>
              <p className="mt-2 text-muted-foreground">
                Entre na sua conta para continuar aprendendo
              </p>
            </div>

            {/* Login social: ainda não disponível na API nova */}
            <OAuthButtons mode="login" />

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted-foreground">ou entre com email</span>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-level-purple-dark">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full rounded-xl border-2 border-border bg-white pl-11 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-medium text-level-purple-dark">Senha</label>
                  <Link
                    href="/esqueci-senha"
                    className="text-sm text-level-purple hover:text-level-purple-dark transition-colors"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="w-full rounded-xl border-2 border-border bg-white pl-11 pr-12 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <LevelButton
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </LevelButton>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link href="/signup" className="font-semibold text-level-purple hover:text-level-purple-dark transition-colors">
                Cadastre-se gratuitamente
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
