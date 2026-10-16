"use client"

import { useState } from "react"
import Link from "next/link"
import { Rocket, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { LevelButton } from "@/components/design-system/level-button"
import { ApiError, errorMessage, requestPasswordReset } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      // Por privacidade a resposta é a mesma exista ou não a conta; só
      // mostramos erro quando o pedido em si falhou (rede, limite, e-mail inválido).
      if (err instanceof ApiError && err.status === 404) setSent(true)
      else setError(errorMessage(err, "Não foi possível enviar o link. Tente novamente."))
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-level-purple-dark">Esqueci minha senha</h1>
          <p className="mt-2 text-muted-foreground">
            Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        {sent ? (
          <div role="status" className="flex items-start gap-3 rounded-xl bg-green-50 px-4 py-4 text-sm text-green-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Se existir uma conta com <strong>{email}</strong>, enviamos um link para redefinir a senha.
              Verifique sua caixa de entrada (e o spam). O link expira em breve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-medium text-level-purple-dark">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="forgot-email"
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
            <LevelButton variant="primary" size="lg" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </LevelButton>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-level-purple hover:text-level-purple-dark transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  )
}
