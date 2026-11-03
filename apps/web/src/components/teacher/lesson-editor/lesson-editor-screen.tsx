"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { TeacherSuccessModal } from "@/components/gamification/teacher-success-modal"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { useTransientFlag } from "@/hooks/use-transient-value"
import { fetchModules, fetchTeacherCourses } from "@/lib/api"
import { ROUTES, SAVED_FEEDBACK_DURATION_MS } from "@/lib/constants"
import { swalConfirm, swalError, swalToast, swalWarning } from "@/lib/swal"
import { CheckpointsTab } from "./checkpoints-tab"
import { ConfigTab } from "./config-tab"
import { ContentTab } from "./content-tab"
import { EditorHeader } from "./editor-header"
import { EditorTabsNav, isTabVisible, type EditorTabId } from "./editor-tabs"
import { LibrariesTab } from "./libraries-tab"
import { QuizTab } from "./quiz-tab"
import { StarterFilesTab } from "./starter-files-tab"
import { TestsTab } from "./tests-tab"
import { useLessonEditor, type EditableLesson } from "./use-lesson-editor"

/** Cursos e módulos só preenchem os seletores; sem eles o editor continua funcionando. */
async function orEmpty<TItem>(promise: Promise<TItem[]>): Promise<TItem[]> {
  try {
    return await promise
  } catch {
    return []
  }
}

const PUBLISH_CONFIRMATIONS = {
  publish: {
    title: "Publicar lição?",
    text: "A lição ficará disponível para todos os alunos.",
    confirmText: "Publicar",
  },
  unpublish: {
    title: "Despublicar lição?",
    text: "A lição deixará de aparecer para os alunos.",
    confirmText: "Despublicar",
  },
} as const

interface LessonEditorScreenProps {
  /** `null` para uma lição nova. */
  initial: EditableLesson | null
  onCreated: (lessonId: string) => void
}

export function LessonEditorScreen({ initial, onCreated }: LessonEditorScreenProps): React.JSX.Element {
  const router = useRouter()
  const editor = useLessonEditor(initial, { onCreated })
  const { form, patchForm, lessonId } = editor
  const [selectedTab, setSelectedTab] = useState<EditorTabId>("config")
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const savedFeedback = useTransientFlag(SAVED_FEEDBACK_DURATION_MS)
  const courses = useAsyncResource(() => orEmpty(fetchTeacherCourses()), [])
  const modules = useAsyncResource(() => orEmpty(fetchModules()), [])

  // Se o tipo da lição mudar e a aba escolhida não existir mais, mostra o conteúdo.
  const tab = isTabVisible(selectedTab, form.lesson_type) ? selectedTab : "conteudo"
  const isNewLesson = initial === null

  // Lição recém-criada: troca a URL para /teacher/edit/<id> sem recarregar o editor
  // (o estado local já é a versão salva).
  useEffect(() => {
    if (isNewLesson && lessonId) window.history.replaceState(null, "", ROUTES.teacherLesson(lessonId))
  }, [isNewLesson, lessonId])

  const handleSave = async (publish?: boolean): Promise<void> => {
    if (publish !== undefined) {
      const confirmation = PUBLISH_CONFIRMATIONS[publish ? "publish" : "unpublish"]
      if (!(await swalConfirm({ ...confirmation, icon: "question" }))) return
    }

    setInlineError(null)
    const result = await editor.save(publish)
    if (!result.ok) {
      setInlineError(result.message)
      if (result.focusTests) setSelectedTab("testes")
      await swalError({ title: result.title, text: result.message })
      return
    }

    if (result.publishError) {
      setInlineError(`A lição foi salva, mas não foi publicada: ${result.publishError}`)
      await swalWarning({ title: "Lição salva como rascunho", text: result.publishError })
      if (form.lesson_type === "coding" && editor.drafts.length === 0) setSelectedTab("testes")
      return
    }

    savedFeedback.activate()
    if (result.created || publish === true) setIsSuccessOpen(true)
    else swalToast({ title: publish === false ? "Lição despublicada." : "Alterações salvas.", icon: "success" })
  }

  const showError = (message: string): void => void swalError({ text: message })
  const testErrorCount = editor.compiled.errorCount
  const alertMessage = inlineError ?? editor.loadError

  return (
    <div className="min-h-screen bg-white">
      <TeacherSuccessModal
        isOpen={isSuccessOpen}
        type="lesson"
        title={form.title}
        published={editor.published}
        onClose={() => setIsSuccessOpen(false)}
        onView={lessonId ? () => router.push(ROUTES.lesson(lessonId)) : undefined}
      />

      <EditorHeader
        isNew={!lessonId}
        title={form.title}
        isPublished={editor.published}
        isSaving={editor.isSaving}
        isDirty={editor.isDirty}
        hasJustSaved={savedFeedback.isActive}
        onSave={() => void handleSave()}
        onPublish={() => void handleSave(true)}
        onUnpublish={() => void handleSave(false)}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {alertMessage && (
          <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {alertMessage}
          </div>
        )}

        <EditorTabsNav
          current={tab}
          lessonType={form.lesson_type}
          onChange={setSelectedTab}
          badges={{
            testes: testErrorCount
              ? { text: `${testErrorCount} erro(s)`, isDanger: true }
              : { text: String(editor.drafts.length), isDanger: editor.drafts.length === 0 },
            ...(form.lesson_type === "quiz" && { questoes: { text: String(editor.quiz.length) } }),
          }}
        />

        {tab === "config" && (
          <ConfigTab
            form={form}
            onChange={patchForm}
            courses={courses.status === "success" ? courses.data : []}
            modules={modules.status === "success" ? modules.data : []}
          />
        )}

        {tab === "conteudo" && (
          <ContentTab
            title={form.title}
            moduleTitle={form.module}
            content={form.content_markdown}
            onChange={(content_markdown) => patchForm({ content_markdown })}
            onError={showError}
          />
        )}

        {tab === "questoes" && form.lesson_type === "quiz" && (
          <QuizTab questions={editor.quiz} onChange={editor.setQuiz} passingScore={form.quiz_passing_score} />
        )}

        {tab === "exercicio" && form.lesson_type === "coding" && (
          <StarterFilesTab files={form.starter_files} onChange={(starter_files) => patchForm({ starter_files })} onError={showError} />
        )}

        {tab === "testes" && form.lesson_type === "coding" && (
          <TestsTab drafts={editor.drafts} onChange={editor.setDrafts} isPublished={editor.published} />
        )}

        {tab === "checkpoints" && form.lesson_type === "coding" && (
          <CheckpointsTab checkpoints={form.checkpoints} onChange={(checkpoints) => patchForm({ checkpoints })} />
        )}

        {tab === "libs" && form.lesson_type === "coding" && (
          <LibrariesTab
            selected={form.libraries}
            onChange={(libraries) => patchForm({ libraries })}
            onToast={(title) => swalToast({ title, icon: "success" })}
          />
        )}
      </main>
    </div>
  )
}
