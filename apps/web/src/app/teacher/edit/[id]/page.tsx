"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { LessonEditorScreen } from "@/components/teacher/lesson-editor/lesson-editor-screen"
import { loadLessonForEditing } from "@/components/teacher/lesson-editor/use-lesson-editor"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { ROUTES } from "@/lib/constants"

/** Segmento da rota de criação (`/teacher/edit/new`). */
const NEW_LESSON_ID = "new"

export default function TeacherEditPage(): React.JSX.Element {
  const { id: routeId } = useParams<{ id: string }>()
  // Depois do primeiro salvamento a URL ganha o id da lição criada; o editor aberto
  // continua o mesmo (o estado local já é a versão salva), sem recarregar.
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null)
  const sourceId = routeId === createdLessonId ? NEW_LESSON_ID : routeId

  const source = useAsyncResource(
    async () => (sourceId === NEW_LESSON_ID ? null : loadLessonForEditing(sourceId)),
    [sourceId],
    { errorMessage: "Não foi possível carregar a lição." },
  )

  if (source.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }
  if (source.status === "error") return <LessonLoadError message={source.error} />
  if (sourceId !== NEW_LESSON_ID && source.data === null) return <LessonLoadError message="Lição não encontrada." />

  return <LessonEditorScreen key={sourceId} initial={source.data} onCreated={setCreatedLessonId} />
}

interface LessonLoadErrorProps {
  message: string
}

function LessonLoadError({ message }: LessonLoadErrorProps): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <AlertCircle className="h-10 w-10 text-destructive/60" />
      <p className="text-sm font-semibold text-level-purple-dark">{message}</p>
      <Link href={ROUTES.teacher} className="rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark">
        Voltar ao painel
      </Link>
    </div>
  )
}
