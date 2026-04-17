"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LevelButton } from "@/components/design-system/level-button"
import { Rocket, Mail, Lock, Eye, EyeOff, Github, AlertCircle, CheckCircle2 } from "lucide-react"

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Email ou senha incorretos."
  if (message.includes("Email not confirmed"))
    return "Confirme seu email antes de entrar. Verifique sua caixa de entrada."
  if (message.includes("Too many requests"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente."
  if (message.includes("User not found"))
    return "Nenhuma conta encontrada com esse email."
  return message
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/dashboard"
  const hasAuthError = searchParams.get("error") === "auth"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    hasAuthError ? "Ocorreu um erro na autenticação. Tente novamente." : ""
  )
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Digite seu email acima para receber o link de redefinição.")
      return
    }
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?redirect=/settings`,
    })
    if (error) {
      setError(translateAuthError(error.message))
      return
    }
    setResetSent(true)
    setTimeout(() => setResetSent(false), 5000)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(translateAuthError(error.message))
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const handleOAuthLogin = async (provider: "google" | "github") => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    })
  }

  return (
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

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthLogin("google")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </button>
            <button
              onClick={() => handleOAuthLogin("github")}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Github className="h-5 w-5" />
              Continuar com GitHub
            </button>
          </div>

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
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {resetSent && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Email de redefinição enviado! Verifique sua caixa de entrada.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-level-purple-dark">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
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
                <label className="text-sm font-medium text-level-purple-dark">Senha</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-level-purple hover:text-level-purple-dark transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  required
                  className="w-full rounded-xl border-2 border-border bg-white pl-11 pr-12 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                />
                <button
                  type="button"
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
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
