"use client"

import { useParams, useRouter } from "next/navigation"
import { ResponsiveWorkspace } from "@/components/ide/responsive-workspace"
import { Header } from "@/components/ide/header"
import { LessonPanel } from "@/components/ide/lesson-panel"
import { LessonFooter } from "@/components/ide/lesson-footer"
import { CodeEditor } from "@/components/ide/code-editor"
import { ConsolePanel } from "@/components/ide/console-panel"
import { FileExplorer } from "@/components/ide/file-explorer"
import { getLevelUpTransition, SuccessFeedback } from "@/components/ide/success-feedback"
import { IDEProvider, useIDE } from "@/contexts/ide-context"
import type { Lesson, LessonSummary } from "@levelusp/contracts"
import { fetchPublishedLessonSummaries, fetchLesson } from "@/lib/api"
import { Loader2, BookOpen } from "lucide-react"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { useLessonNavigation } from "@/hooks/use-lesson-navigation"
import { TheoryLessonLayout } from "@/components/ide/theory-lesson-layout"
import { QuizLessonLayout } from "@/components/ide/quiz-lesson-layout"
import { ROUTES } from "@/lib/constants"

function LessonWorkspace({ lesson, allLessons, currentIndex }: LessonPageData): React.JSX.Element {
  const {
    files, activePath, openPaths, setActivePath, openFile, closeTab, updateFileContent,
    createFile, renameFile, deleteFile,
    consoleOutputs, clearConsole, runConsoleCommand,
    pythonStatus, isExecuting, isInstalling, stop,
    run, reset, verify,
    hasRun, hasOutput, canVerify, lessonProgress, allPassed, isVerifying,
    lastResult, levelBefore, isSuccessOpen, setIsSuccessOpen,
  } = useIDE()
  const navigation = useLessonNavigation(allLessons, currentIndex, lesson)
  const levelUp = getLevelUpTransition(lastResult, levelBefore)
  const tabs = openPaths.map((path) => files.find((file) => file.path === path)).filter((file) => file !== undefined)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <Header lessonTitle={`Módulo: ${lesson.module} — ${lesson.title}`} lessonProgress={lessonProgress} />

      <div className="flex-1 overflow-hidden">
        <ResponsiveWorkspace
          lessonPanel={
            <LessonPanel
              moduleName={lesson.module}
              title={lesson.title}
              estimatedTime={`Dificuldade: ${lesson.difficulty} · +${lesson.xp_reward} XP`}
              content={lesson.content_markdown}
              checkpoints={lesson.checkpoints.map((checkpoint) => ({ ...checkpoint, isCompleted: allPassed }))}
              hasRun={hasRun}
              hasOutput={hasOutput}
              onVerify={() => void verify()}
              isVerifying={isVerifying}
              canVerify={canVerify || allPassed}
              isVerified={allPassed}
            />
          }
          editor={
            <CodeEditor
              tabs={tabs}
              activePath={activePath}
              onTabSelect={setActivePath}
              onTabClose={closeTab}
              onContentChange={updateFileContent}
              onRun={run}
              onReset={() => void reset()}
              onStop={stop}
              isRunning={isExecuting}
              isInstalling={isInstalling}
              pythonStatus={pythonStatus}
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
        currentIndex={navigation.positionInCourse}
        total={navigation.courseLessonCount}
        onPrev={navigation.goToPrevious}
        onNext={navigation.goToNext}
      />

      <SuccessFeedback
        isOpen={isSuccessOpen}
        xpEarned={lastResult?.xp_awarded ?? 0}
        hasNextLesson={navigation.hasNextLesson}
        isCourseEnd={navigation.isCourseEnd}
        prevLevel={levelUp?.prevLevel}
        newLevel={levelUp?.newLevel}
        onClose={() => setIsSuccessOpen(false)}
        onNext={navigation.goToNext}
      />
    </div>
  )
}

interface LessonPageData {
  lesson: Lesson
  /** Sumários leves de todas as lições, para a navegação anterior/próxima. */
  allLessons: LessonSummary[]
  currentIndex: number
}

/** `null` quando a lição não existe ou não está publicada. */
async function loadLessonPage(lessonId: string): Promise<LessonPageData | null> {
  const [allLessons, lesson] = await Promise.all([fetchPublishedLessonSummaries(), fetchLesson(lessonId)])
  if (!lesson) return null
  const index = allLessons.findIndex((summary) => summary.id === lessonId)
  return { lesson, allLessons, currentIndex: Math.max(index, 0) }
}

const LESSON_MISSING_MESSAGE = "Esta lição não existe ou não está disponível."
const LESSON_LOAD_ERROR_MESSAGE = "Não foi possível carregar a lição. Verifique sua conexão e tente novamente."

/** Falha de rede (com nova tentativa) é diferente de lição inexistente. */
function LessonUnavailable({ onRetry }: { onRetry?: () => void }): React.JSX.Element {
  const router = useRouter()
  const isLoadError = Boolean(onRetry)
  return (
    <main role={isLoadError ? "alert" : undefined} className="flex h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <BookOpen className="h-16 w-16 text-muted-foreground/30" aria-hidden="true" />
      <h1 className="text-lg font-semibold text-level-purple-dark">
        {isLoadError ? "Não foi possível carregar a lição" : "Lição não encontrada"}
      </h1>
      <p className="text-sm text-muted-foreground">{isLoadError ? LESSON_LOAD_ERROR_MESSAGE : LESSON_MISSING_MESSAGE}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"
          >
            Tentar novamente
          </button>
        )}
        <button
          onClick={() => router.push(ROUTES.dashboard)}
          className={isLoadError
            ? "rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-level-purple-dark hover:border-level-purple transition-colors"
            : "rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors"}
        >
          Voltar ao painel
        </button>
      </div>
    </main>
  )
}

export default function LessonPage(): React.JSX.Element {
  const { id: lessonId } = useParams<{ id: string }>()
  const page = useAsyncResource(() => loadLessonPage(lessonId), [lessonId])

  if (page.status === "loading") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
        <p className="text-sm text-muted-foreground">Carregando lição...</p>
      </div>
    )
  }

  if (page.status === "error") return <LessonUnavailable onRetry={() => void page.reload()} />
  if (!page.data) return <LessonUnavailable />

  const { lesson, allLessons, currentIndex } = page.data

  // Questionário e teoria não usam a IDE; a correção do questionário é feita no servidor.
  if (lesson.lesson_type === "quiz") {
    return <QuizLessonLayout key={lesson.id} lesson={lesson} allLessons={allLessons} currentIndex={currentIndex} />
  }
  if (lesson.lesson_type === "theory") {
    return <TheoryLessonLayout key={lesson.id} lesson={lesson} allLessons={allLessons} currentIndex={currentIndex} />
  }

  return (
    <IDEProvider lesson={lesson}>
      <LessonWorkspace lesson={lesson} allLessons={allLessons} currentIndex={currentIndex} />
    </IDEProvider>
  )
}
