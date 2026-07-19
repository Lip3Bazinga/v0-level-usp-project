"use client"

// Rota legada /ide — hoje o IDE oficial vive em /lesson/[id] (IDEProvider +
// avaliação server-side). Esta página só resolve para qual lição mandar o
// aluno: ?lesson=<id> se válido; senão a primeira lição não concluída; senão
// a primeira publicada. Substitui ~490 linhas que duplicavam o fluxo de lição.

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { fetchPublishedLessonSummaries } from "@/lib/supabase/lessons"
import { Loader2 } from "lucide-react"

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
          router.replace("/dashboard")
          return
        }

        const requested = searchParams.get("lesson")
        if (requested && lessons.some((l) => l.id === requested)) {
          router.replace(`/lesson/${requested}`)
          return
        }

        // Primeira lição ainda não concluída pelo usuário logado
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: progress } = await supabase
            .from("lesson_progress")
            .select("lesson_id, status")
            .eq("user_id", user.id)
            .eq("status", "completed")
          const done = new Set((progress ?? []).map((p: { lesson_id: string }) => p.lesson_id))
          const next = lessons.find((l) => !done.has(l.id))
          if (!cancelled) router.replace(`/lesson/${(next ?? lessons[0]).id}`)
          return
        }

        router.replace(`/lesson/${lessons[0].id}`)
      } catch {
        if (!cancelled) router.replace("/dashboard")
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
