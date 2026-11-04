"use client"

// Rota legada /ide: a IDE oficial vive em /lesson/[id]. Esta página só decide para qual
// lição mandar o aluno: ?lesson=<id> se válido; senão a primeira lição não concluída;
// senão a primeira publicada.

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchMyCompletedLessonIds, fetchPublishedLessonSummaries, HTTP_STATUS, nullOnStatus } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { isNonEmpty } from "@/lib/utils"

async function resolveIdeDestination(requestedLessonId: string | null): Promise<string> {
  try {
    const lessons = await fetchPublishedLessonSummaries()
    if (!isNonEmpty(lessons)) return ROUTES.dashboard
    if (requestedLessonId && lessons.some((lesson) => lesson.id === requestedLessonId)) return ROUTES.lesson(requestedLessonId)
    // Sem sessão, ninguém concluiu nada: começa pela primeira lição.
    const completedLessonIds = (await nullOnStatus(fetchMyCompletedLessonIds(), HTTP_STATUS.UNAUTHORIZED)) ?? new Set<string>()
    const nextLesson = lessons.find((lesson) => !completedLessonIds.has(lesson.id)) ?? lessons[0]
    return ROUTES.lesson(nextLesson.id)
  } catch {
    return ROUTES.dashboard
  }
}

function IdeRedirect(): React.JSX.Element {
  const router = useRouter()
  const requestedLessonId = useSearchParams().get("lesson")
  const destination = useAsyncResource(() => resolveIdeDestination(requestedLessonId), [requestedLessonId])
  const destinationRoute = destination.status === "success" ? destination.data : null

  useEffect(() => {
    if (destinationRoute) router.replace(destinationRoute)
  }, [destinationRoute, router])

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3">
      <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      <p className="text-sm text-muted-foreground">Abrindo o IDE...</p>
    </div>
  )
}

export default function IdePage(): React.JSX.Element {
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
