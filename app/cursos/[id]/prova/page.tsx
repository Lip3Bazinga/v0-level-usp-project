"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  fetchExamStatus, startExam, submitExam, issueCertificate,
  type ExamStatus, type ExamStart, type ExamResult,
} from "@/lib/exam-client"
import {
  ArrowLeft, Award, CheckCircle2, Clock, GraduationCap, Loader2,
  Lock, Rocket, ShieldCheck, XCircle, AlertTriangle,
} from "lucide-react"

type Phase = "status" | "running" | "result"

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function ProvaPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const { profile, isLoading: authLoading } = useAuth()

  const [phase, setPhase] = useState<Phase>("status")
  const [status, setStatus] = useState<ExamStatus | null>(null)
  const [exam, setExam] = useState<ExamStart | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<ExamResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [certCode, setCertCode] = useState<string | null>(null)
  const submittedRef = useRef(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchExamStatus(courseId)
    if (res.ok) setStatus(res.data)
    else if (res.status === 401) router.push("/login")
    else setError(res.error)
    setLoading(false)
  }, [courseId, router])

  useEffect(() => {
    if (!authLoading) {
      if (!profile) { router.push("/login"); return }
      loadStatus()
    }
  }, [authLoading, profile, loadStatus, router])

  // Cronômetro
  useEffect(() => {
    if (phase !== "running" || !exam) return
    const tick = () => {
      const ms = new Date(exam.expiresAt).getTime() - Date.now()
      setRemainingMs(ms)
      if (ms <= 0 && !submittedRef.current) handleSubmit()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, exam])

  const handleStart = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await startExam(courseId)
    if (res.ok) {
      submittedRef.current = false
      setExam(res.data)
      setAnswers({})
      setPhase("running")
    } else {
      setError(res.error)
    }
    setLoading(false)
  }, [courseId])

  const handleSubmit = useCallback(async () => {
    if (!exam || submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    const res = await submitExam(courseId, exam.attemptId, answers)
    setSubmitting(false)
    if (res.ok) {
      setResult(res.data)
      setPhase("result")
    } else {
      setError(res.error)
      submittedRef.current = false
      if (res.status === 408 || res.status === 409) {
        setPhase("status")
        loadStatus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, answers, courseId, loadStatus])

  const handleIssueCertificate = useCallback(async () => {
    setLoading(true)
    const res = await issueCertificate(courseId)
    setLoading(false)
    if (res.ok) setCertCode(res.data.verificationCode)
    else setError(res.error)
  }, [courseId])

  if (authLoading || (loading && phase === "status" && !status)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      </div>
    )
  }

  const answeredCount = Object.keys(answers).length

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-level-purple-dark">LevelUSP</span>
          </Link>
          {phase === "running" && remainingMs !== null ? (
            <div className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-sm font-bold ${
              remainingMs < 5 * 60_000 ? "bg-red-50 text-red-600" : "bg-level-purple-subtle text-level-purple-dark"
            }`}>
              <Clock className="h-4 w-4" />
              {formatCountdown(remainingMs)}
            </div>
          ) : (
            <Link href={`/cursos/${courseId}`} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-level-purple transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar ao curso
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Fase: status ── */}
        {phase === "status" && status && (
          <div className="rounded-3xl border border-border bg-white p-8">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple-subtle">
                <GraduationCap className="h-7 w-7 text-level-purple" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-level-purple-dark">{status.exam.title}</h1>
                <p className="text-sm text-muted-foreground">{status.exam.description}</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Questões", value: String(status.exam.questionCount) },
                { label: "Nota mínima", value: `${status.exam.passingScore}%` },
                { label: "Tempo limite", value: `${status.exam.timeLimitMinutes} min` },
                { label: "Tentativas feitas", value: String(status.attemptsCount) },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-muted/40 p-4 text-center">
                  <p className="text-xl font-bold text-level-purple-dark">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {status.passed ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
                  <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
                  <div>
                    <p className="font-bold text-green-800">
                      Aprovado com {status.passedScore?.toFixed(0)}%! 🎉
                    </p>
                    <p className="text-sm text-green-700">
                      Agora conclua o projeto final do curso para emitir seu certificado.
                    </p>
                  </div>
                </div>
                {certCode ? (
                  <a
                    href={`/certificado/${certCode}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-yellow-400 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-yellow-400/30"
                  >
                    <Award className="h-5 w-5" />
                    Ver meu certificado — {certCode}
                  </a>
                ) : (
                  <button
                    onClick={handleIssueCertificate}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple py-3.5 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-5 w-5" />}
                    Emitir certificado
                  </button>
                )}
                <p className="text-center text-xs text-muted-foreground">
                  A emissão exige: todas as lições concluídas (inclusive o projeto final) + prova aprovada.
                </p>
              </div>
            ) : !status.eligible ? (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
                <Lock className="h-8 w-8 shrink-0 text-amber-500" />
                <div>
                  <p className="font-bold text-amber-800">Prova bloqueada</p>
                  <p className="text-sm text-amber-700">
                    Conclua as {status.lessonsRemaining} lições restantes (de {status.lessonsTotal}) para desbloquear a prova.
                  </p>
                </div>
              </div>
            ) : status.cooldownUntil && new Date(status.cooldownUntil) > new Date() ? (
              <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
                <Clock className="h-8 w-8 shrink-0 text-amber-500" />
                <div>
                  <p className="font-bold text-amber-800">Aguarde para tentar de novo</p>
                  <p className="text-sm text-amber-700">
                    Próxima tentativa disponível às{" "}
                    {new Date(status.cooldownUntil).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    {status.bestScore !== null && ` · Sua melhor nota: ${status.bestScore.toFixed(0)}%`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {status.bestScore !== null && (
                  <p className="text-center text-sm text-muted-foreground">
                    Sua melhor nota até agora: <span className="font-bold">{status.bestScore.toFixed(0)}%</span>
                  </p>
                )}
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple py-3.5 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                  {status.inProgressAttemptId ? "Retomar prova em andamento" : "Começar a prova"}
                </button>
                <p className="text-center text-xs text-muted-foreground">
                  O cronômetro começa ao iniciar e não pausa. Responda todas as {status.exam.questionCount} questões.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Fase: prova ── */}
        {phase === "running" && exam && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
              Respondidas: <span className="font-bold text-level-purple-dark">{answeredCount}/{exam.questions.length}</span>
              {exam.resumed && " · Tentativa retomada"}
            </div>

            {exam.questions.map((q, qi) => (
              <div key={q.id} className="rounded-2xl border border-border bg-white p-6">
                <p className="mb-4 font-semibold text-level-purple-dark">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-level-purple-subtle text-xs font-bold text-level-purple">
                    {qi + 1}
                  </span>
                  <span className="whitespace-pre-wrap">{q.prompt}</span>
                </p>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 text-sm transition-colors ${
                        answers[q.id] === oi
                          ? "border-level-purple bg-level-purple-subtle text-level-purple-dark"
                          : "border-border hover:border-level-purple/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === oi}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                        className="mt-0.5 accent-[#7C3AED]"
                      />
                      <span className="whitespace-pre-wrap font-mono text-[13px]">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-4 text-sm font-bold text-white transition-colors hover:bg-green-600 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              Entregar prova ({answeredCount}/{exam.questions.length} respondidas)
            </button>
          </div>
        )}

        {/* ── Fase: resultado ── */}
        {phase === "result" && result && (
          <div className="space-y-6">
            <div className={`rounded-3xl border-2 p-8 text-center ${
              result.passed ? "border-green-300 bg-green-50" : "border-red-200 bg-red-50"
            }`}>
              {result.passed ? (
                <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-green-600" />
              ) : (
                <XCircle className="mx-auto mb-3 h-14 w-14 text-red-500" />
              )}
              <h2 className={`text-3xl font-bold ${result.passed ? "text-green-800" : "text-red-700"}`}>
                {result.score.toFixed(0)}%
              </h2>
              <p className={`mt-1 font-medium ${result.passed ? "text-green-700" : "text-red-600"}`}>
                {result.passed
                  ? `Aprovado! (${result.correctCount} de ${result.total} corretas)`
                  : `Não foi dessa vez — nota mínima: ${result.passingScore}% (${result.correctCount}/${result.total} corretas)`}
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {result.passed ? (
                  <button
                    onClick={() => { setPhase("status"); loadStatus() }}
                    className="rounded-xl bg-level-purple px-6 py-3 text-sm font-bold text-white hover:bg-level-purple-dark transition-colors"
                  >
                    Continuar para o certificado →
                  </button>
                ) : (
                  <button
                    onClick={() => { setPhase("status"); loadStatus() }}
                    className="rounded-xl bg-level-purple px-6 py-3 text-sm font-bold text-white hover:bg-level-purple-dark transition-colors"
                  >
                    Voltar e revisar
                  </button>
                )}
                <Link
                  href={`/cursos/${courseId}`}
                  className="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-level-purple transition-colors"
                >
                  Voltar ao curso
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-6">
              <h3 className="mb-4 text-sm font-bold text-level-purple-dark">Correção por questão</h3>
              <div className="space-y-3">
                {result.review.map((r, i) => (
                  <div key={r.questionId} className={`flex items-start gap-3 rounded-xl p-3 text-sm ${
                    r.correct ? "bg-green-50" : "bg-red-50"
                  }`}>
                    {r.correct
                      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                    <div>
                      <p className={`font-semibold ${r.correct ? "text-green-800" : "text-red-700"}`}>
                        Questão {i + 1}: {r.correct ? "correta" : "incorreta"}
                      </p>
                      {!r.correct && r.explanation && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{r.explanation}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
