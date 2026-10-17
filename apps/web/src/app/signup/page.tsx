"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Lock, Mail, User } from "lucide-react"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import {
  AuthField,
  AuthSubmitButton,
  FormErrorAlert,
  PasswordField,
} from "@/components/design-system/auth-form"
import {
  AuthBrandPanel,
  AuthDivider,
  AuthFooterPrompt,
  AuthHeading,
  AuthSplitLayout,
} from "@/components/design-system/auth-layout"
import { useAuth } from "@/contexts/auth-context"
import { useSubmitLock } from "@/hooks/use-submit-lock"
import { ROUTES } from "@/lib/constants"
import { PASSWORD_MIN_LENGTH, getPasswordPolicyError } from "@/lib/utils/password"

const SIGNUP_BENEFITS = [
  "Aprenda Python do zero ao avançado",
  "Ganhe XP e suba de nível",
  "IDE completa no navegador",
  "Certificados reconhecidos pela USP",
] as const

function SignupBrandPanel() {
  return (
    <AuthBrandPanel description="Comece sua jornada na programação hoje. 100% gratuito, 100% gamificado.">
      <div className="mt-12 space-y-4 text-left">
        {SIGNUP_BENEFITS.map((benefit) => (
          <div key={benefit} className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-300 shrink-0" />
            <span className="text-purple-100">{benefit}</span>
          </div>
        ))}
      </div>
    </AuthBrandPanel>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const submitLock = useSubmitLock()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage("")

    const passwordError = getPasswordPolicyError(password)
    if (passwordError) {
      setErrorMessage(passwordError)
      return
    }

    if (!submitLock.acquire()) return
    const result = await signUp({ email: email.trim(), password, full_name: fullName.trim() })
    if (!result.ok) {
      setErrorMessage(result.error)
      submitLock.release()
      return
    }

    // A API já abre a sessão (cookie httpOnly) no cadastro.
    router.push(ROUTES.dashboard)
    router.refresh()
  }

  return (
    <AuthSplitLayout brandPanel={<SignupBrandPanel />}>
      <AuthHeading
        as="h2"
        title="Crie sua conta"
        description="Comece a aprender programação gratuitamente"
      />
      <OAuthButtons mode="signup" />
      <AuthDivider label="ou cadastre com email" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && <FormErrorAlert message={errorMessage} />}

        <AuthField
          id="signup-name"
          label="Nome completo"
          icon={User}
          type="text"
          autoComplete="name"
          value={fullName}
          onValueChange={setFullName}
          placeholder="Seu nome completo"
          required
        />

        <AuthField
          id="signup-email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          value={email}
          onValueChange={setEmail}
          placeholder="seu@email.com"
          required
        />

        <PasswordField
          id="signup-password"
          label="Senha"
          icon={Lock}
          hint="Mínimo de 10 caracteres, com pelo menos uma letra e um número."
          value={password}
          onValueChange={setPassword}
          placeholder="Mínimo 10 caracteres, com letra e número"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          isVisible={isPasswordVisible}
          onToggleVisibility={() => setIsPasswordVisible((isVisible) => !isVisible)}
        />

        <AuthSubmitButton
          isSubmitting={submitLock.isSubmitting}
          submittingLabel="Criando conta..."
          hasSpinner
        >
          Criar Conta Gratuita
        </AuthSubmitButton>
      </form>

      <AuthFooterPrompt prompt="Já tem uma conta?" href={ROUTES.login} linkLabel="Fazer login" />
    </AuthSplitLayout>
  )
}
