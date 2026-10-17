"use client"

// Rota legada /ide — hoje o IDE oficial vive em /lesson/[id] (IDEProvider +
// avaliação server-side). Esta página só resolve para qual lição mandar o
// aluno: ?lesson=<id> se válido; senão a primeira lição não concluída; senão
// a primeira publicada. Substitui ~490 linhas que duplicavam o fluxo de lição.

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ApiError, fetchPublishedLessonSummaries, fetchMyCompletedLessonIds } from "@/lib/api"
import { Loader2 } from "lucide-react"
import { ROUTES } from "@/lib/constants"

function IdeRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      try {
        const lessons = await fetchPublishedLessonSummaries()
        if (cancelled) return
        if (!lessons.length) {
          router.replace(ROUTES.dashboard)
          return
        }

        const requested = searchParams.get("lesson")
        if (requested && lessons.some((l) => l.id === requested)) {
          router.replace(ROUTES.lesson(requested))
          return
        }

        // Primeira lição ainda não concluída pelo usuário logado (sessão via cookie)
        let completedLessonIds = new Set<string>()
        try {
          completedLessonIds = await fetchMyCompletedLessonIds()
        } catch (err) {
          if (!(err instanceof ApiError && err.status === 401)) throw err
        }
        const nextLesson = lessons.find((lesson) => !completedLessonIds.has(lesson.id))
        if (!cancelled) router.replace(ROUTES.lesson((nextLesson ?? lessons[0]).id))
      } catch {
        if (!cancelled) router.replace(ROUTES.dashboard)
      }
    }

    resolve()
    return () => { cancelled = true }
  }, [router, searchParams])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      <p className="text-sm text-muted-foreground">Abrindo o IDE...</p>
    </div>
  )
}

export default function IdePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        </div>
      }
    >
      <IdeRedirect />
    </Suspense>
  )
}
