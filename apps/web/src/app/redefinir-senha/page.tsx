"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Rocket, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { passwordSchema } from "@levelusp/contracts"
import { LevelButton } from "@/components/design-system/level-button"
import { errorMessage, resetPassword } from "@/lib/api"

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const check = passwordSchema.safeParse(password)
    if (!check.success) {
      setError(check.error.issues[0]?.message ?? "Senha inválida.")
      return
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => router.push("/login"), 2500)
    } catch (err) {
      setError(errorMessage(err, "Não foi possível redefinir a senha. Peça um novo link."))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div role="alert" className="space-y-4 text-sm">
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Link inválido ou incompleto.
        </div>
        <Link href="/esqueci-senha" className="font-semibold text-level-purple hover:text-level-purple-dark">
          Pedir um novo link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Senha redefinida! Redirecionando para o login...
      </div>
    )
  }

  const inputClass =
    "w-full rounded-xl border-2 border-border bg-white pl-11 pr-12 py-3 text-foreground placeholder:text-muted-foreground focus:border-level-purple focus:outline-none transition-colors"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="new-password" className="text-sm font-medium text-level-purple-dark">Nova senha</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="new-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 10 caracteres, com letra e número"
            required
            minLength={10}
            className={inputClass}
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
      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium text-level-purple-dark">Confirme a nova senha</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>
      <LevelButton variant="primary" size="lg" disabled={loading} className="w-full">
        {loading ? "Salvando..." : "Redefinir senha"}
      </LevelButton>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-level-purple-dark">LevelUSP</span>
        </div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-level-purple-dark">Criar nova senha</h1>
          <p className="mt-2 text-muted-foreground">Escolha uma senha com pelo menos 10 caracteres, incluindo letras e números.</p>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
