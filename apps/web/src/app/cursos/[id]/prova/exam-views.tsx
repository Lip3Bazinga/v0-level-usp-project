"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Award, CheckCircle2, Clock, GraduationCap, Loader2, Lock, ShieldCheck, XCircle } from "lucide-react"
import type { ExamResult, ExamStart, ExamStatus } from "@levelusp/contracts"
import { ROUTES } from "@/lib/constants"
import { formatPercent, formatTime } from "@/lib/utils"
import type { ExamAnswers } from "./use-exam-session"

const PRIMARY_BUTTON_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple py-3.5 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50"

interface ExamStatusCardProps {
  status: ExamStatus
  certificateCode: string | null
  isBusy: boolean
  onStart: () => void
  onIssueCertificate: () => void
}

export function ExamStatusCard({ status, certificateCode, isBusy, onStart, onIssueCertificate }: ExamStatusCardProps) {
  const { exam } = status
  const facts = [
    { label: "Questões", value: String(exam.questionCount) },
    { label: "Nota mínima", value: `${exam.passingScore}%` },
    { label: "Tempo limite", value: `${exam.timeLimitMinutes} min` },
    { label: "Tentativas feitas", value: String(status.attemptsCount) },
  ]

  return (
    <div className="rounded-3xl border border-border bg-white p-8">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple-subtle">
          <GraduationCap className="h-7 w-7 text-level-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-level-purple-dark">{exam.title}</h1>
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl bg-muted/40 p-4 text-center">
            <p className="text-xl font-bold text-level-purple-dark">{fact.value}</p>
            <p className="text-xs text-muted-foreground">{fact.label}</p>
          </div>
        ))}
      </div>

      <ExamStatusAction
        status={status}
        certificateCode={certificateCode}
        isBusy={isBusy}
        onStart={onStart}
        onIssueCertificate={onIssueCertificate}
      />
    </div>
  )
}

/** Fim da espera entre tentativas, se ainda não passou. */
function activeCooldownEnd({ cooldownUntil }: ExamStatus): string | null {
  return cooldownUntil && new Date(cooldownUntil) > new Date() ? cooldownUntil : null
}

function ExamStatusAction({ status, certificateCode, isBusy, onStart, onIssueCertificate }: ExamStatusCardProps) {
  if (status.passed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
          <div>
            <p className="font-bold text-green-800">Aprovado com {formatPercent(status.passedScore ?? 0)}! 🎉</p>
            <p className="text-sm text-green-700">Agora conclua o projeto final do curso para emitir seu certificado.</p>
          </div>
        </div>
        {certificateCode ? (
          <a
            href={ROUTES.certificate(certificateCode)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-yellow-400 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-yellow-400/30"
          >
            <Award className="h-5 w-5" />
            Ver meu certificado — {certificateCode}
          </a>
        ) : (
          <button onClick={onIssueCertificate} disabled={isBusy} className={PRIMARY_BUTTON_CLASS}>
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-5 w-5" />}
            Emitir certificado
          </button>
        )}
        <p className="text-center text-xs text-muted-foreground">
          A emissão exige: todas as lições concluídas (inclusive o projeto final) + prova aprovada.
        </p>
      </div>
    )
  }

  if (!status.eligible) {
    return (
      <Notice icon={<Lock className="h-8 w-8 shrink-0 text-amber-500" />} title="Prova bloqueada">
        Conclua as {status.lessonsRemaining} lições restantes (de {status.lessonsTotal}) para desbloquear a prova.
      </Notice>
    )
  }

  const cooldownEnd = activeCooldownEnd(status)
  if (cooldownEnd) {
    return (
      <Notice icon={<Clock className="h-8 w-8 shrink-0 text-amber-500" />} title="Aguarde para tentar de novo">
        Próxima tentativa disponível às {formatTime(cooldownEnd)}
        {status.bestScore !== null && ` · Sua melhor nota: ${formatPercent(status.bestScore)}`}
      </Notice>
    )
  }

  return (
    <div className="space-y-4">
      {status.bestScore !== null && (
        <p className="text-center text-sm text-muted-foreground">
          Sua melhor nota até agora: <span className="font-bold">{formatPercent(status.bestScore)}</span>
        </p>
      )}
      <button onClick={onStart} disabled={isBusy} className={PRIMARY_BUTTON_CLASS}>
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
        {status.inProgressAttemptId ? "Retomar prova em andamento" : "Começar a prova"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        O cronômetro começa ao iniciar e não pausa. Responda todas as {status.exam.questionCount} questões.
      </p>
    </div>
  )
}

interface NoticeProps {
  icon: ReactNode
  title: string
  children: ReactNode
}

function Notice({ icon, title, children }: NoticeProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
      {icon}
      <div>
        <p className="font-bold text-amber-800">{title}</p>
        <p className="text-sm text-amber-700">{children}</p>
      </div>
    </div>
  )
}

interface ExamQuestionsFormProps {
  exam: ExamStart
  answers: ExamAnswers
  isSubmitting: boolean
  onAnswer: (questionId: string, optionIndex: number) => void
  onSubmit: () => void
}

export function ExamQuestionsForm({ exam, answers, isSubmitting, onAnswer, onSubmit }: ExamQuestionsFormProps) {
  const answeredCount = Object.keys(answers).length
  const questionCount = exam.questions.length

  const handleSubmit = () => {
    const missingCount = questionCount - answeredCount
    const confirmation = `Você deixou ${missingCount} ${missingCount === 1 ? "questão" : "questões"} sem resposta. Entregar mesmo assim?`
    if (missingCount > 0 && !window.confirm(confirmation)) return
    onSubmit()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        Respondidas: <span className="font-bold text-level-purple-dark">{answeredCount}/{questionCount}</span>
        {exam.resumed && " · Tentativa retomada"}
      </div>

      {exam.questions.map((question, questionIndex) => (
        <div key={question.id} className="rounded-2xl border border-border bg-white p-6">
          <p id={`q-${question.id}`} className="mb-4 font-semibold text-level-purple-dark">
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-level-purple-subtle text-xs font-bold text-level-purple">
              {questionIndex + 1}
            </span>
            <span className="whitespace-pre-wrap">{question.prompt}</span>
          </p>
          <div role="radiogroup" aria-labelledby={`q-${question.id}`} className="space-y-2">
            {question.options.map((option, optionIndex) => {
              const isChosen = answers[question.id] === optionIndex
              return (
                <label
                  key={optionIndex}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-sm transition-colors ${
                    isChosen ? "border-level-purple bg-level-purple-subtle text-level-purple-dark" : "border-border hover:border-level-purple/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={isChosen}
                    onChange={() => onAnswer(question.id, optionIndex)}
                    className="mt-0.5 accent-[#7C3AED]"
                  />
                  <span className="whitespace-pre-wrap font-mono text-[13px]">{option}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-4 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
        Entregar prova ({answeredCount}/{questionCount} respondidas)
      </button>
    </div>
  )
}

interface ExamResultViewProps {
  courseId: string
  result: ExamResult
  onBackToStatus: () => void
}

export function ExamResultView({ courseId, result, onBackToStatus }: ExamResultViewProps) {
  const { passed } = result
  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border-2 p-8 text-center ${passed ? "border-green-300 bg-green-50" : "border-red-200 bg-red-50"}`}>
        {passed ? (
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-600" />
        ) : (
          <XCircle className="mx-auto mb-3 h-14 w-14 text-red-500" />
        )}
        <h2 className={`text-3xl font-bold ${passed ? "text-green-800" : "text-red-700"}`}>{formatPercent(result.score)}</h2>
        <p className={`mt-1 font-medium ${passed ? "text-green-700" : "text-red-600"}`}>
          {passed
            ? `Aprovado! (${result.correctCount} de ${result.total} corretas)`
            : `Não foi dessa vez — nota mínima: ${result.passingScore}% (${result.correctCount}/${result.total} corretas)`}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={onBackToStatus}
            className="rounded-xl bg-level-purple px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark"
          >
            {passed ? "Continuar para o certificado →" : "Voltar e revisar"}
          </button>
          <Link
            href={ROUTES.course(courseId)}
            className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-level-purple"
          >
            Voltar ao curso
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h3 className="mb-4 text-sm font-bold text-level-purple-dark">Correção por questão</h3>
        {result.review.length === 0 && (
          <p className="text-sm text-muted-foreground">
            A correção detalhada fica disponível depois da aprovação. Revise as lições do curso e tente de novo quando o prazo de
            espera acabar.
          </p>
        )}
        <div className="space-y-3">
          {result.review.map((review, index) => (
            <div key={review.questionId} className={`flex items-start gap-3 rounded-xl p-3 text-sm ${review.correct ? "bg-green-50" : "bg-red-50"}`}>
              {review.correct ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              )}
              <div>
                <p className={`font-semibold ${review.correct ? "text-green-800" : "text-red-700"}`}>
                  Questão {index + 1}: {review.correct ? "correta" : "incorreta"}
                </p>
                {!review.correct && review.explanation && <p className="mt-0.5 text-xs text-muted-foreground">{review.explanation}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
