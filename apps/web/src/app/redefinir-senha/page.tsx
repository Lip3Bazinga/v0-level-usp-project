"use client"

import { Suspense, useEffect, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Lock } from "lucide-react"
import {
  AuthSubmitButton,
  FormErrorAlert,
  PasswordField,
} from "@/components/auth/auth-form"
import { AuthCenteredLayout } from "@/components/auth/auth-layout"
import { useSubmitLock } from "@/hooks/use-submit-lock"
import { getErrorMessage, resetPassword } from "@/lib/api"
import { ROUTES, LOGIN_REDIRECT_DELAY_MS } from "@/lib/constants"
import { PASSWORD_MIN_LENGTH, getPasswordPolicyError } from "@/lib/utils"

function InvalidResetLinkNotice() {
  return (
    <div role="alert" className="space-y-4 text-sm">
      <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Link inválido ou incompleto.
      </div>
      <Link
        href={ROUTES.forgotPassword}
        className="font-semibold text-level-purple hover:text-level-purple-dark"
      >
        Pedir um novo link
      </Link>
    </div>
  )
}

function PasswordResetDoneNotice() {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      Senha redefinida! Redirecionando para o login...
    </div>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token") ?? ""
  const submitLock = useSubmitLock()

  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!isDone) return
    const timerId = setTimeout(() => router.push(ROUTES.login), LOGIN_REDIRECT_DELAY_MS)
    return () => clearTimeout(timerId)
  }, [isDone, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage("")
    const passwordError = getPasswordPolicyError(password)
    if (passwordError) {
      setErrorMessage(passwordError)
      return
    }
    if (password !== passwordConfirmation) {
      setErrorMessage("As senhas não coincidem.")
      return
    }
    if (!submitLock.acquire()) return
    try {
      await resetPassword(token, password)
      setIsDone(true)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Não foi possível redefinir a senha. Peça um novo link."),
      )
    } finally {
      submitLock.release()
    }
  }

  if (!token) return <InvalidResetLinkNotice />
  if (isDone) return <PasswordResetDoneNotice />

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && <FormErrorAlert message={errorMessage} />}
      <PasswordField
        id="new-password"
        label="Nova senha"
        icon={Lock}
        autoComplete="new-password"
        value={password}
        onValueChange={setPassword}
        placeholder="Mínimo 10 caracteres, com letra e número"
        required
        minLength={PASSWORD_MIN_LENGTH}
        isVisible={isPasswordVisible}
        onToggleVisibility={() => setIsPasswordVisible((isVisible) => !isVisible)}
      />
      <PasswordField
        id="confirm-password"
        label="Confirme a nova senha"
        icon={Lock}
        autoComplete="new-password"
        value={passwordConfirmation}
        onValueChange={setPasswordConfirmation}
        required
        isVisible={isPasswordVisible}
      />
      <AuthSubmitButton isSubmitting={submitLock.isSubmitting} submittingLabel="Salvando...">
        Redefinir senha
      </AuthSubmitButton>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthCenteredLayout
      title="Criar nova senha"
      description="Escolha uma senha com pelo menos 10 caracteres, incluindo letras e números."
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCenteredLayout>
  )
}
