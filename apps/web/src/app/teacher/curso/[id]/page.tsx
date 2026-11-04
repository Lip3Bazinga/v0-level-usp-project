"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import { CourseEditorScreen } from "@/components/teacher/course-editor/course-editor-screen"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchCourse } from "@/lib/api"
import { ROUTES } from "@/lib/constants"

/** Segmento da rota de criação (`/teacher/curso/new`). */
const NEW_COURSE_ID = "new"

export default function TeacherCourseEditPage() {
  const { id: routeId } = useParams<{ id: string }>()
  // Depois do primeiro salvamento a URL ganha o id do curso criado; o editor aberto
  // continua o mesmo, sem recarregar.
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null)
  const sourceId = routeId === createdCourseId ? NEW_COURSE_ID : routeId

  const source = useAsyncResource(async () => (sourceId === NEW_COURSE_ID ? null : fetchCourse(sourceId)), [sourceId], {
    errorMessage: "Não foi possível carregar o curso.",
  })

  if (source.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }
  if (source.status === "error") return <CourseLoadError message={source.error} />
  if (sourceId !== NEW_COURSE_ID && source.data === null) return <CourseLoadError message="Curso não encontrado." />

  return <CourseEditorScreen key={sourceId} initial={source.data} onCreated={setCreatedCourseId} />
}

interface CourseLoadErrorProps {
  message: string
}

function CourseLoadError({ message }: CourseLoadErrorProps) {
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
