"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ResponsiveWorkspace } from "@/components/ide/responsive-workspace"
import { Header } from "@/components/ide/header"
import { LessonPanel } from "@/components/ide/lesson-panel"
import { LessonFooter } from "@/components/ide/lesson-footer"
import { CodeEditor } from "@/components/ide/code-editor"
import { ConsolePanel } from "@/components/ide/console-panel"
import { FileExplorer } from "@/components/ide/file-explorer"
import { SuccessFeedback } from "@/components/ide/success-feedback"
import { IDEProvider, useIDE } from "@/contexts/ide-context"
import { fetchPublishedLessons, fetchLessonById } from "@/lib/supabase/lessons"
import type { Lesson } from "@/lib/supabase/types"
import { Loader2, BookOpen } from "lucide-react"
import { TheoryLessonLayout } from "@/components/ide/theory-lesson-layout"

// ── Layout interno (consome o IDEContext) ──────────────────────────────────────

function LessonWorkspace({
  lesson,
  allLessons,
  currentIndex,
}: {
  lesson: Lesson
  allLessons: Lesson[]
  currentIndex: number
}) {
  const router = useRouter()
  const {
    files, activePath, openPaths, setActivePath, openFile, closeTab, onContentChange,
    createFile, renameFile, deleteFile,
    consoleOutputs, clearConsole, runConsoleCommand,
    pythonStatus, isExecuting, isInstalling, stop,
    run, reset, verify,
    hasRun, hasOutput, canVerify, lessonProgress, allPassed, isVerifying,
    showSuccess, setShowSuccess,
  } = useIDE()

  // Filtra apenas lições do mesmo curso para progresso e navegação corretos
  const courseLessons = allLessons.filter((l) => l.course_id === lesson.course_id)
  const courseIndex = courseLessons.findIndex((l) => l.id === lesson.id)
  const courseTotal = courseLessons.length || 1

  const nextLesson = allLessons[currentIndex + 1]
  const hasNextLesson = !!nextLesson && nextLesson.course_id === lesson.course_id
  const isCourseEnd = !hasNextLesson && !!lesson.course_id

  const handlePrev = useCallback(() => {
    const prev = allLessons[currentIndex - 1]
    if (prev && prev.course_id === lesson.course_id) router.push(`/lesson/${prev.id}`)
  }, [allLessons, currentIndex, lesson.course_id, router])

  const handleNext = useCallback(() => {
    const next = allLessons[currentIndex + 1]
    if (next && next.course_id === lesson.course_id) {
      router.push(`/lesson/${next.id}`)
    } else if (lesson.course_id) {
      router.push(`/cursos/${lesson.course_id}`)
    } else {
      router.push("/dashboard")
    }
  }, [allLessons, currentIndex, lesson.course_id, router])

  // Abas abertas = paths abertos resolvidos para { path, content }
  const tabs = openPaths
    .map((p) => files.find((f) => f.path === p))
    .filter((f): f is NonNullable<typeof f> => !!f)
    .map((f) => ({ path: f.path, content: f.content }))

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header
        lessonTitle={`Módulo: ${lesson.module} — ${lesson.title}`}
        lessonProgress={lessonProgress}
      />

      <div className="flex-1 overflow-hidden">
        <ResponsiveWorkspace
          lessonPanel={
            <LessonPanel
              moduleName={lesson.module}
              title={lesson.title}
              estimatedTime={`Dificuldade: ${lesson.difficulty} · +${lesson.xp_reward} XP`}
              content={lesson.content_markdown}
              checkpoints={(lesson.checkpoints ?? []).map((c) => ({ ...c, completed: allPassed }))}
              hasRun={hasRun}
              hasOutput={hasOutput}
              onVerify={verify}
              isVerifying={isVerifying}
              canVerify={canVerify || allPassed}
            />
          }
          editor={
            <CodeEditor
              tabs={tabs}
              activePath={activePath}
              onTabSelect={setActivePath}
              onTabClose={closeTab}
              onContentChange={onContentChange}
              onRun={run}
              onReset={reset}
              onStop={stop}
              isRunning={isExecuting}
              isInstalling={isInstalling}
              pyodideStatus={pythonStatus}
              solutionCode={undefined}
            />
          }
          console={
            <ConsolePanel
              outputs={consoleOutputs}
              onClear={clearConsole}
              isRunning={isExecuting}
              onRunCommand={runConsoleCommand}
            />
          }
          fileExplorer={
            <FileExplorer
              files={files}
              activePath={activePath}
              onSelect={openFile}
              onCreate={createFile}
              onRename={renameFile}
              onDelete={deleteFile}
            />
          }
        />
      </div>

      <LessonFooter
        currentIndex={courseIndex >= 0 ? courseIndex : currentIndex}
        total={courseTotal}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <SuccessFeedback
        show={showSuccess}
        xpEarned={lesson.xp_reward}
        hasNextLesson={hasNextLesson}
        isCourseEnd={isCourseEnd}
        onClose={() => setShowSuccess(false)}
        onNext={handleNext}
      />
    </div>
  )
}

// ── Página: carrega a lição e provê o IDEContext ────────────────────────────────

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string

  const [allLessons, setAllLessons] = useState<Lesson[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [lessonLoading, setLessonLoading] = useState(true)
  const [lessonError, setLessonError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLessonLoading(true)
      setLessonError(null)
      try {
        const [lessons, direct] = await Promise.all([
          fetchPublishedLessons(),
          fetchLessonById(lessonId),
        ])
        setAllLessons(lessons)
        const idx = lessons.findIndex((l) => l.id === lessonId)
        if (idx >= 0) {
          setCurrentIndex(idx)
          setLesson(lessons[idx])
        } else if (direct) {
          setLesson(direct)
          setCurrentIndex(0)
        } else {
          setLessonError("Lição não encontrada.")
        }
      } catch {
        setLessonError("Erro ao carregar lição.")
      } finally {
        setLessonLoading(false)
      }
    }
    load()
  }, [lessonId])

  if (lessonLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando lição...</p>
      </div>
    )
  }

  if (lessonError || !lesson) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <BookOpen className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-level-purple-dark">Lição não encontrada</h2>
        <p className="text-sm text-muted-foreground">{lessonError ?? "Esta lição não existe ou não está disponível."}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
        >
          Voltar ao Dashboard
        </button>
      </div>
    )
  }

  // Aulas teóricas: layout leve sem IDE
  if (lesson.lesson_type === "theory") {
    return (
      <TheoryLessonLayout
        key={lesson.id}
        lesson={lesson}
        allLessons={allLessons}
        currentIndex={currentIndex}
        onComplete={() => {}}
      />
    )
  }

  return (
    <IDEProvider lesson={lesson} allLessons={allLessons}>
      <LessonWorkspace lesson={lesson} allLessons={allLessons} currentIndex={currentIndex} />
    </IDEProvider>
  )
}
