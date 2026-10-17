"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { passwordSchema } from "@levelusp/contracts"
import { LevelButton } from "@/components/design-system/level-button"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import { useAuth } from "@/contexts/auth-context"
import { Rocket, Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle2 } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Mesma política de senha da API (schema compartilhado em @levelusp/contracts).
    const check = passwordSchema.safeParse(password)
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Senha inválida.")
      return
    }

    setLoading(true)
    const { error } = await signUp({ email: email.trim(), password, full_name: fullName.trim() })
    if (error) {
      setError(error)
      setLoading(false)
      return
    }

    // A API já abre a sessão (cookie httpOnly) no cadastro.
    router.push("/dashboard")
    router.refresh()
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
            Comece sua jornada na programação hoje. 100% gratuito, 100% gamificado.
          </p>
          <div className="mt-12 space-y-4 text-left">
            {[
              "Aprenda Python do zero ao avançado",
              "Ganhe XP e suba de nível",
              "IDE completa no navegador",
              "Certificados reconhecidos pela USP",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-300 shrink-0" />
                <span className="text-purple-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — Signup Form */}
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
            <h2 className="text-2xl font-bold text-level-purple-dark">Crie sua conta</h2>
            <p className="mt-2 text-muted-foreground">
              Comece a aprender programação gratuitamente
            </p>
          </div>

          {/* Cadastro social: ainda não disponível na API nova */}
          <OAuthButtons mode="signup" />

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground">ou cadastre com email</span>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-level-purple-dark">Nome completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="w-full rounded-xl border-2 border-border bg-white pl-11 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"
                />
              </div>
            </div>

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
              <label className="text-sm font-medium text-level-purple-dark">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 10 caracteres, com letra e número"
                  autoComplete="new-password"
                  required
                  minLength={10}
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
                  Criando conta...
                </span>
              ) : (
                "Criar Conta Gratuita"
              )}
            </LevelButton>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link href="/login" className="font-semibold text-level-purple hover:text-level-purple-dark transition-colors">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
