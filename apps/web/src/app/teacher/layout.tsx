"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ShieldAlert } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ROUTES } from "@/lib/constants"

interface TeacherLayoutProps {
  children: ReactNode
}

/**
 * Protege todas as rotas /teacher/*. Sem isto, um aluno que navegue direto para
 * /teacher/curso/new recebe o editor completo e só descobre a falta de permissão
 * como um 403 da API ao salvar. A API continua sendo a fonte de verdade
 * (@Roles("teacher", "admin") + checagem de dono); este guard só dá uma mensagem clara antes.
 */
export default function TeacherLayout({ children }: TeacherLayoutProps): React.JSX.Element {
  const router = useRouter()
  const { user, profile, isLoading } = useAuth()
  const canAuthor = profile?.role === "teacher" || profile?.role === "admin"

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace(ROUTES.login)
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!canAuthor) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-level-purple-dark">
          Área restrita a professores
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Sua conta está registrada como aluno, por isso não é possível criar ou
          editar cursos. Se você leciona na USP, solicite acesso de professor a
          um administrador da plataforma.
        </p>
        <Link
          href={ROUTES.dashboard}
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
        >
          Voltar ao painel
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
