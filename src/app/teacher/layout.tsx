"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, ShieldAlert } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

// Protege todas as rotas /teacher/*. Sem isto, um aluno que navegue direto para
// /teacher/curso/novo recebe o editor completo e só descobre a falta de permissão
// como um 403 cru da RLS ao salvar. O banco continua sendo a fonte de verdade —
// este guard existe para dar uma mensagem clara, não para substituir a RLS.
export default function TeacherLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, profile, isLoading } = useAuth()

  const role = profile?.role
  const allowed = role === "teacher" || role === "admin"

  useEffect(() => {
    if (isLoading) return
    if (!user) router.replace("/login")
  }, [isLoading, user, router])

  // Enquanto carrega, ou logo após disparar o redirect para /login
  if (isLoading || !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!allowed) {
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
          href="/dashboard"
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
