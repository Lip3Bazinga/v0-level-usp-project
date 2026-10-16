"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import type { Course, Module } from "@levelusp/contracts"
import { fetchModules, fetchTeacherCourses } from "@/lib/api"
import { TeacherSuccessModal } from "@/components/gamification/teacher-success-modal"
import { swalConfirm, swalError, swalToast, swalWarning } from "@/lib/swal"
import { useLessonEditor } from "@/components/teacher/lesson-editor/use-lesson-editor"
import { EditorHeader } from "@/components/teacher/lesson-editor/editor-header"
import { EditorTabsNav, isTabVisible, type EditorTabId } from "@/components/teacher/lesson-editor/editor-tabs"
import { ConfigTab } from "@/components/teacher/lesson-editor/config-tab"
import { ContentTab } from "@/components/teacher/lesson-editor/content-tab"
import { QuizTab } from "@/components/teacher/lesson-editor/quiz-tab"
import { StarterFilesTab } from "@/components/teacher/lesson-editor/starter-files-tab"
import { TestsTab } from "@/components/teacher/lesson-editor/tests-tab"
import { CheckpointsTab } from "@/components/teacher/lesson-editor/checkpoints-tab"
import { LibrariesTab } from "@/components/teacher/lesson-editor/libraries-tab"

export default function TeacherEditPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const editor = useLessonEditor(params.id)
  const { form, patchForm } = editor

  const [tab, setTab] = useState<EditorTabId>("config")
  const [courses, setCourses] = useState<Course[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  useEffect(() => {
    fetchTeacherCourses().then(setCourses).catch(() => {})
    fetchModules().then(setModules).catch(() => {})
  }, [])

  // Lição recém-criada: troca a URL para /teacher/edit/<id> sem recarregar o
  // editor (o estado local já é a versão salva).
  useEffect(() => {
    if (editor.lessonId && params.id === "new") {
      window.history.replaceState(null, "", `/teacher/edit/${editor.lessonId}`)
    }
  }, [editor.lessonId, params.id])

  // Se o tipo mudar e a aba atual não existir mais, volta para o conteúdo.
  useEffect(() => {
    if (!isTabVisible(tab, form.lesson_type)) setTab("conteudo")
  }, [form.lesson_type, tab])

  const handleSave = async (publish?: boolean) => {
    if (publish === true) {
      const ok = await swalConfirm({
        title: "Publicar lição?",
        text: "A lição ficará disponível para todos os alunos.",
        confirmText: "Publicar",
        icon: "question",
      })
      if (!ok) return
    } else if (publish === false) {
      const ok = await swalConfirm({
        title: "Despublicar lição?",
        text: "A lição deixará de aparecer para os alunos.",
        confirmText: "Despublicar",
        icon: "question",
      })
      if (!ok) return
    }

    setInlineError(null)
    const result = await editor.save(publish)
    if (!result.ok) {
      setInlineError(result.message)
      if (result.focusTests) setTab("testes")
      await swalError({ title: result.title, text: result.message })
      return
    }

    if (result.publishError) {
      setInlineError(`A lição foi salva, mas não foi publicada: ${result.publishError}`)
      await swalWarning({ title: "Lição salva como rascunho", text: result.publishError })
      if (form.lesson_type === "coding" && editor.drafts.length === 0) setTab("testes")
      return
    }

    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
    if (result.created || publish === true) setSuccessOpen(true)
    else swalToast({ title: publish === false ? "Lição despublicada." : "Alterações salvas.", icon: "success" })
  }

  if (editor.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
      </div>
    )
  }

  if (editor.loadError && !editor.isNew && !form.title) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive/60" />
        <p className="text-sm font-semibold text-level-purple-dark">{editor.loadError}</p>
        <Link href="/teacher" className="rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark">
          Voltar ao painel
        </Link>
      </div>
    )
  }

  const testErrors = editor.compiled.errorCount
  const showError = (message: string) => swalError({ text: message })

  return (
    <div className="min-h-screen bg-white">
      <TeacherSuccessModal
        show={successOpen}
        type="lesson"
        title={form.title}
        onClose={() => setSuccessOpen(false)}
        onView={editor.lessonId ? () => router.push(`/lesson/${editor.lessonId}`) : undefined}
      />

      <EditorHeader
        isNew={editor.isNew && !editor.lessonId}
        title={form.title}
        published={editor.published}
        saving={editor.saving}
        dirty={editor.dirty}
        justSaved={justSaved}
        onSave={() => handleSave()}
        onPublish={() => handleSave(true)}
        onUnpublish={() => handleSave(false)}
      />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {(inlineError || editor.loadError) && (
          <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {inlineError ?? editor.loadError}
          </div>
        )}

        <EditorTabsNav
          current={tab}
          lessonType={form.lesson_type}
          onChange={setTab}
          badges={{
            testes: testErrors
              ? { text: `${testErrors} erro(s)`, danger: true }
              : { text: String(editor.drafts.length), danger: editor.drafts.length === 0 },
            questoes: form.lesson_type === "quiz" ? { text: String(editor.quiz.length) } : undefined,
          }}
        />

        {tab === "config" && <ConfigTab form={form} patch={patchForm} courses={courses} modules={modules} />}

        {tab === "conteudo" && (
          <ContentTab
            title={form.title}
            module={form.module}
            content={form.content_markdown}
            onChange={(content_markdown) => patchForm({ content_markdown })}
            onError={showError}
          />
        )}

        {tab === "questoes" && form.lesson_type === "quiz" && (
          <QuizTab
            questions={editor.quiz}
            setQuestions={editor.setQuiz}
            passingScore={form.quiz_passing_score}
            loading={editor.quizLoading}
          />
        )}

        {tab === "exercicio" && form.lesson_type === "coding" && (
          <StarterFilesTab files={form.starter_files} onChange={(starter_files) => patchForm({ starter_files })} onError={showError} />
        )}

        {tab === "testes" && form.lesson_type === "coding" && (
          <TestsTab drafts={editor.drafts} onChange={editor.setDrafts} published={editor.published} />
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
