"use client"

import { useState, type FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react"
import { AuthField, AuthSubmitButton, FormErrorAlert } from "@/components/auth/auth-form"
import { AUTH_LINK_CLASS, AuthCenteredLayout } from "@/components/auth/auth-layout"
import { useSubmitLock } from "@/hooks/use-submit-lock"
import { HTTP_STATUS, getErrorMessage, isApiError, requestPasswordReset } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"

function ResetLinkSentNotice({ email }: { email: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl bg-green-50 px-4 py-4 text-sm text-green-700"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      <p>
        Se existir uma conta com <strong>{email}</strong>, enviamos um link para redefinir a senha.
        Verifique sua caixa de entrada (e o spam). O link expira em breve.
      </p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  const submitLock = useSubmitLock()
  const [email, setEmail] = useState("")
  const [isSent, setIsSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!submitLock.acquire()) return
    setErrorMessage("")
    try {
      await requestPasswordReset(email.trim())
      setIsSent(true)
    } catch (error) {
      // Por privacidade a resposta é a mesma exista ou não a conta; só
      // mostramos erro quando o pedido em si falhou (rede, limite, e-mail inválido).
      if (isApiError(error, HTTP_STATUS.NOT_FOUND)) setIsSent(true)
      else
        setErrorMessage(getErrorMessage(error, "Não foi possível enviar o link. Tente novamente."))
    } finally {
      submitLock.release()
    }
  }

  return (
    <AuthCenteredLayout
      title="Esqueci minha senha"
      description="Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha."
    >
      {isSent ? (
        <ResetLinkSentNotice email={email} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && <FormErrorAlert message={errorMessage} />}
          <AuthField
            id="forgot-email"
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            value={email}
            onValueChange={setEmail}
            placeholder="seu@email.com"
            required
          />
          <AuthSubmitButton isSubmitting={submitLock.isSubmitting} submittingLabel="Enviando...">
            Enviar link de redefinição
          </AuthSubmitButton>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href={ROUTES.login} className={cn(AUTH_LINK_CLASS, "inline-flex items-center gap-1")}>
          <ArrowLeft className="h-4 w-4" /> Voltar para o login
        </Link>
      </p>
    </AuthCenteredLayout>
  )
}
