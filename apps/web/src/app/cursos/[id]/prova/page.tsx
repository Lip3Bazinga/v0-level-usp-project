"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, Clock, Loader2 } from "lucide-react"
import { EXAM_LOW_TIME_WARNING_MS, ROUTES } from "@/lib/constants"
import { BrandLogo } from "@/components/design-system/brand-logo"
import { StudentHeaderBar } from "@/components/dashboard/student-shell"
import { cn } from "@/lib/utils"
import { formatCountdown } from "./exam-countdown"
import { ExamQuestionsForm, ExamResultView, ExamStatusCard } from "./exam-views"
import { useExamSession } from "./use-exam-session"

export default function ProvaPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const session = useExamSession(courseId)
  const { phase, remainingMs } = session

  if (session.isInitialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <StudentHeaderBar className="max-w-4xl">
        <BrandLogo href={ROUTES.dashboard} />
        {phase.name === "running" && remainingMs !== null ? (
          <div
            role="timer"
            aria-label="Tempo restante da prova"
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-sm font-bold",
              remainingMs < EXAM_LOW_TIME_WARNING_MS ? "bg-red-50 text-red-600" : "bg-level-purple-subtle text-level-purple-dark",
            )}
          >
            <Clock className="h-4 w-4" />
            {formatCountdown(remainingMs)}
          </div>
        ) : (
          <Link
            href={ROUTES.course(courseId)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-level-purple"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao curso
          </Link>
        )}
      </StudentHeaderBar>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {session.errorMessage && (
          <div role="alert" className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {session.errorMessage}
          </div>
        )}

        {phase.name === "status" && session.status && (
          <ExamStatusCard
            status={session.status}
            certificateCode={session.certificateCode}
            isBusy={session.isBusy}
            onStart={session.start}
            onIssueCertificate={session.requestCertificate}
          />
        )}

        {phase.name === "running" && (
          <ExamQuestionsForm
            exam={phase.exam}
            answers={session.answers}
            isSubmitting={session.isSubmitting}
            onAnswer={session.answerQuestion}
            onSubmit={session.submit}
          />
        )}

        {phase.name === "result" && (
          <ExamResultView courseId={courseId} result={phase.result} onBackToStatus={session.backToStatus} />
        )}
      </main>
    </div>
  )
}
