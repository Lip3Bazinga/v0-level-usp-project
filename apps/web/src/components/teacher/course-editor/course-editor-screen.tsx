"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, BookOpen, X } from "lucide-react"
import type { Course } from "@levelusp/contracts"
import { TeacherSuccessModal } from "@/components/gamification/teacher-success-modal"
import { useTransientFlag } from "@/hooks/use-transient-value"
import { ROUTES, SAVED_FEEDBACK_DURATION_MS } from "@/lib/constants"
import { swalConfirm, swalError, swalToast, swalWarning } from "@/lib/swal"
import { CourseBasicsSection } from "./course-basics-section"
import { CourseCoverSection } from "./course-cover-section"
import { CourseEditorHeader } from "./course-editor-header"
import { CourseFinalProjectSection } from "./course-final-project-section"
import { validateCourseForm } from "./course-form"
import { CourseLessonsSection } from "./course-lessons-section"
import { CoursePreview } from "./course-preview"
import { EditorSection } from "./editor-section"
import { useCourseEditor } from "./use-course-editor"
import { useCourseLessons } from "./use-course-lessons"

interface CourseEditorScreenProps {
  /** `null` para um curso novo. */
  initial: Course | null
  onCreated: (courseId: string) => void
}

export function CourseEditorScreen({ initial, onCreated }: CourseEditorScreenProps): React.JSX.Element {
  const router = useRouter()
  const editor = useCourseEditor(initial, { onCreated })
  const { form, patchForm, courseId, setError } = editor
  const lessons = useCourseLessons(courseId, setError)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const savedFeedback = useTransientFlag(SAVED_FEEDBACK_DURATION_MS)
  const isNewCourse = initial === null

  // Curso recém-criado: troca a URL para /teacher/curso/<id> sem recarregar o editor.
  useEffect(() => {
    if (isNewCourse && courseId) window.history.replaceState(null, "", ROUTES.teacherCourse(courseId))
  }, [isNewCourse, courseId])

  const handleSave = async (publish?: boolean): Promise<void> => {
    const invalid = validateCourseForm(form)
    if (invalid) {
      await swalError({ title: "Verifique os dados do curso", text: invalid })
      return
    }
    if (publish === true) {
      const confirmed = await swalConfirm({
        title: "Publicar curso?",
        text: "O curso ficará visível para todos os alunos.",
        confirmText: "Publicar",
        icon: "question",
      })
      if (!confirmed) return
    }

    const result = await editor.save(publish, lessons.courseLessons.length)
    if (!result.ok) {
      await swalError({ title: result.title, text: result.message })
      return
    }
    if (result.publishSkipped) {
      await swalWarning({ title: "Curso salvo como rascunho", text: "Adicione ao menos uma lição antes de publicar o curso." })
    }
    savedFeedback.activate()
    if (result.created || publish === true) setIsSuccessOpen(true)
    else swalToast({ title: publish === false ? "Curso despublicado." : "Alterações salvas.", icon: "success" })
  }

  return (
    <div className="min-h-screen bg-background">
      <TeacherSuccessModal
        isOpen={isSuccessOpen}
        type="course"
        title={form.title}
        onClose={() => setIsSuccessOpen(false)}
        onView={courseId ? () => router.push(ROUTES.course(courseId)) : undefined}
      />

      <CourseEditorHeader
        courseId={courseId}
        title={form.title}
        isPublished={editor.isPublished}
        isSaving={editor.isSaving}
        isReordering={lessons.isReordering}
        hasJustSaved={savedFeedback.isActive}
        onSave={() => void handleSave()}
        onPublish={() => void handleSave(true)}
        onUnpublish={() => void handleSave(false)}
      />

      <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        {editor.error && (
          <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {editor.error}
            <button type="button" aria-label="Fechar aviso" onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <CourseBasicsSection form={form} onChange={patchForm} />

            <CourseCoverSection
              coverPreview={editor.coverPreview}
              isUploading={editor.isUploading}
              onSelectFile={(file) => void editor.uploadCover(file)}
              onRemove={() => void editor.removeCover()}
            />

            <EditorSection icon={BookOpen} title="Lições do Curso" subtitle="Arraste para reordenar · a ordem é salva automaticamente">
              {courseId ? (
                <CourseLessonsSection lessons={lessons} />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Salve o curso primeiro para poder adicionar lições.
                </div>
              )}
            </EditorSection>

            <CourseFinalProjectSection form={form} onChange={patchForm} />
          </div>

          <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <CoursePreview form={form} coverPreview={editor.coverPreview} lessons={lessons.courseLessons} />
          </div>
        </div>
      </main>
    </div>
  )
}
