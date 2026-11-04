"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { ExamResult, ExamStart, ExamSubmitInput } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchExamStatus, HTTP_STATUS, issueCertificate, nullOnStatus, startExam, submitExam, toApiResult } from "@/lib/api"
import { MS_PER_SECOND, ROUTES } from "@/lib/constants"

export type ExamAnswers = ExamSubmitInput["answers"]

export type ExamPhase =
  | { name: "status" }
  | { name: "running"; exam: ExamStart }
  | { name: "result"; result: ExamResult }

/** Prazo esgotado ou tentativa já encerrada no servidor: a tela volta ao resumo atualizado. */
const ATTEMPT_CLOSED_STATUSES: readonly number[] = [HTTP_STATUS.REQUEST_TIMEOUT, HTTP_STATUS.CONFLICT]

/** Uma prova por vez: status → em andamento (com cronômetro) → resultado. */
export function useExamSession(courseId: string) {
  const router = useRouter()
  const { profile, isLoading: isAuthLoading } = useAuth()
  const profileId = profile?.id
  const loginRoute = ROUTES.loginWithNext(ROUTES.courseExam(courseId))

  const [phase, setPhase] = useState<ExamPhase>({ name: "status" })
  const [answers, setAnswers] = useState<ExamAnswers>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const [certificateCode, setCertificateCode] = useState<string | null>(null)
  const hasSubmittedRef = useRef(false)

  // `null`: sem sessão (não há o que buscar) ou sessão expirada (a API respondeu 401).
  const statusResource = useAsyncResource(
    () => (profileId ? nullOnStatus(fetchExamStatus(courseId), HTTP_STATUS.UNAUTHORIZED) : Promise.resolve(null)),
    [courseId, profileId],
  )
  const { reload: reloadStatus } = statusResource
  const isSignedOut = !isAuthLoading && (!profile || (statusResource.status === "success" && statusResource.data === null))

  useEffect(() => {
    if (isSignedOut) router.push(loginRoute)
  }, [isSignedOut, loginRoute, router])

  const refreshStatus = useCallback(async () => {
    setActionError(null)
    setIsBusy(true)
    await reloadStatus()
    setIsBusy(false)
  }, [reloadStatus])

  const start = useCallback(async () => {
    setIsBusy(true)
    setActionError(null)
    const startResult = await toApiResult(startExam(courseId))
    if (startResult.ok) {
      hasSubmittedRef.current = false
      setAnswers({})
      setPhase({ name: "running", exam: startResult.data })
    } else {
      setActionError(startResult.error.message)
    }
    setIsBusy(false)
  }, [courseId])

  const runningExam = phase.name === "running" ? phase.exam : null

  const submit = useCallback(async () => {
    if (!runningExam || hasSubmittedRef.current) return
    hasSubmittedRef.current = true
    setIsSubmitting(true)
    const submitResult = await toApiResult(submitExam(courseId, runningExam.attemptId, answers))
    setIsSubmitting(false)
    if (submitResult.ok) {
      setPhase({ name: "result", result: submitResult.data })
      return
    }
    setActionError(submitResult.error.message)
    hasSubmittedRef.current = false
    if (ATTEMPT_CLOSED_STATUSES.includes(submitResult.error.status)) {
      setPhase({ name: "status" })
      void refreshStatus()
    }
  }, [runningExam, answers, courseId, refreshStatus])

  // O cronômetro só reinicia com a prova; o envio automático precisa da versão mais recente
  // de `submit` (com as respostas atuais), senão a prova sai com as respostas do início.
  const submitRef = useRef(submit)
  useLayoutEffect(() => {
    submitRef.current = submit
  })

  useEffect(() => {
    if (!runningExam) return
    const expiresAtMs = new Date(runningExam.expiresAt).getTime()
    const tick = () => {
      const remaining = expiresAtMs - Date.now()
      setRemainingMs(remaining)
      if (remaining <= 0 && !hasSubmittedRef.current) void submitRef.current()
    }
    tick()
    const intervalId = setInterval(tick, MS_PER_SECOND)
    return () => clearInterval(intervalId)
  }, [runningExam])

  const requestCertificate = useCallback(async () => {
    setIsBusy(true)
    const issueResult = await toApiResult(issueCertificate(courseId))
    setIsBusy(false)
    if (issueResult.ok) setCertificateCode(issueResult.data.verificationCode)
    else setActionError(issueResult.error.message)
  }, [courseId])

  const backToStatus = useCallback(() => {
    setPhase({ name: "status" })
    void refreshStatus()
  }, [refreshStatus])

  const answerQuestion = useCallback((questionId: string, optionIndex: number) => {
    setAnswers((current) => ({ ...current, [questionId]: optionIndex }))
  }, [])

  return {
    isInitialLoading: isAuthLoading || !profile || (phase.name === "status" && statusResource.status === "loading"),
    phase,
    status: statusResource.status === "success" ? statusResource.data : null,
    errorMessage: actionError ?? (statusResource.status === "error" ? statusResource.error : null),
    answers,
    answerQuestion,
    remainingMs,
    certificateCode,
    isSubmitting,
    isBusy,
    start,
    submit,
    requestCertificate,
    backToStatus,
  }
}
