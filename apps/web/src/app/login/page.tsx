"use client"

import { Suspense, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Lock, Mail } from "lucide-react"
import {
  AuthField,
  AuthSubmitButton,
  FormErrorAlert,
  PasswordField,
} from "@/components/auth/auth-form"
import {
  AuthBrandPanel,
  AuthFooterPrompt,
  AuthHeading,
  AuthSplitLayout,
} from "@/components/auth/auth-layout"
import { useAuth } from "@/contexts/auth-context"
import { useSubmitLock } from "@/hooks/use-submit-lock"
import { ROUTES } from "@/lib/constants"
import { safeRedirectPath } from "@/lib/utils"

function LoginBrandPanel(): React.JSX.Element {
  return (
    <AuthBrandPanel description="Aprenda programação de forma gamificada. Uma iniciativa gratuita da Universidade de São Paulo para todo o Brasil." />
  )
}

function LoginForm(): React.JSX.Element {
  const searchParams = useSearchParams()
  // `next` é o parâmetro do middleware novo; `redirect` mantém links antigos.
  const redirectPath = safeRedirectPath(searchParams.get("next") ?? searchParams.get("redirect"))
  const { signIn } = useAuth()
  const submitLock = useSubmitLock()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  // Navegação completa: os providers recarregam com a sessão nova.
  const goToRedirectPath = (): void => window.location.assign(redirectPath)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (!submitLock.acquire()) return
    setErrorMessage("")

    const result = await signIn(email, password)
    if (!result.ok) {
      setErrorMessage(result.error)
      submitLock.release()
      return
    }

    // A sequência conta dias com conclusão: é comemorada ao concluir, não ao entrar.
    goToRedirectPath()
  }

  return (
    <>
      <AuthSplitLayout brandPanel={<LoginBrandPanel />}>
        <AuthHeading
          as="h2"
          title="Bem-vindo de volta!"
          description="Entre na sua conta para continuar aprendendo"
        />
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
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

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
