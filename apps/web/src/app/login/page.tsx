"use client"

import { Suspense, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Lock, Mail } from "lucide-react"
import { OAuthButtons } from "@/components/auth/oauth-buttons"
import {
  AuthField,
  AuthSubmitButton,
  FormErrorAlert,
  PasswordField,
} from "@/components/auth/auth-form"
import {
  AuthBrandPanel,
  AuthDivider,
  AuthFooterPrompt,
  AuthHeading,
  AuthSplitLayout,
} from "@/components/auth/auth-layout"
import { StreakModal } from "@/components/gamification/streak-modal"
import { useAuth } from "@/contexts/auth-context"
import { useSubmitLock } from "@/hooks/use-submit-lock"
import { ROUTES } from "@/lib/constants"
import { safeRedirectPath } from "@/lib/utils"

const PLATFORM_HIGHLIGHTS = [
  { value: "50K+", label: "Estudantes" },
  { value: "200+", label: "Lições" },
  { value: "15", label: "Trilhas" },
] as const

function LoginBrandPanel() {
  return (
    <AuthBrandPanel description="Aprenda programação de forma gamificada. Uma iniciativa gratuita da Universidade de São Paulo para todo o Brasil.">
      <div className="mt-12 grid grid-cols-3 gap-6">
        {PLATFORM_HIGHLIGHTS.map((highlight) => (
          <div key={highlight.label}>
            <div className="text-3xl font-bold text-white">{highlight.value}</div>
            <div className="text-sm text-purple-200">{highlight.label}</div>
          </div>
        ))}
      </div>
    </AuthBrandPanel>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  // `next` é o parâmetro do middleware novo; `redirect` mantém links antigos.
  const redirectPath = safeRedirectPath(searchParams.get("next") ?? searchParams.get("redirect"))
  const { signIn } = useAuth()
  const submitLock = useSubmitLock()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  /** Dias de sequência a comemorar antes de redirecionar; `null` quando não há animação. */
  const [streakDays, setStreakDays] = useState<number | null>(null)

  // Navegação completa: os providers recarregam com a sessão nova.
  const goToRedirectPath = () => window.location.assign(redirectPath)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!submitLock.acquire()) return
    setErrorMessage("")

    const result = await signIn(email, password)
    if (!result.ok) {
      setErrorMessage(result.error)
      submitLock.release()
      return
    }

    if (result.streak?.increased && result.streak.streak > 0) {
      setStreakDays(result.streak.streak)
      submitLock.release()
      return
    }

    goToRedirectPath()
  }

  const handleStreakClose = () => {
    setStreakDays(null)
    goToRedirectPath()
  }

  return (
    <>
      <StreakModal
        isOpen={streakDays !== null}
        streakDays={streakDays ?? 0}
        isNewStreak
        onClose={handleStreakClose}
      />

      <AuthSplitLayout brandPanel={<LoginBrandPanel />}>
        <AuthHeading
          as="h2"
          title="Bem-vindo de volta!"
          description="Entre na sua conta para continuar aprendendo"
        />
        <OAuthButtons mode="login" />
        <AuthDivider label="ou entre com email" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && <FormErrorAlert message={errorMessage} />}

          <AuthField
            id="login-email"
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
            id="login-password"
            label="Senha"
            icon={Lock}
            labelAction={
              <Link
                href={ROUTES.forgotPassword}
                className="text-sm text-level-purple hover:text-level-purple-dark transition-colors"
              >
                Esqueci minha senha
              </Link>
            }
            autoComplete="current-password"
            value={password}
            onValueChange={setPassword}
            placeholder="Sua senha"
            required
            isVisible={isPasswordVisible}
            onToggleVisibility={() => setIsPasswordVisible((isVisible) => !isVisible)}
          />

          <AuthSubmitButton
            isSubmitting={submitLock.isSubmitting}
            submittingLabel="Entrando..."
            hasSpinner
          >
            Entrar
          </AuthSubmitButton>
        </form>

        <AuthFooterPrompt
          prompt="Não tem uma conta?"
          href={ROUTES.signup}
          linkLabel="Cadastre-se gratuitamente"
        />
      </AuthSplitLayout>
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
