"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ExamStatus, LessonProgress, Course, Lesson } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import {
  certificatePdfUrl,
  enrollInCourse,
  fetchCourseWithLessons,
  fetchExamStatus,
  fetchMyCertificate,
  fetchMyProgress,
  getErrorMessage,
  issueCertificate,
  toApiResult,
  unenrollFromCourse,
} from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { swalConfirm, swalError, swalToast } from "@/lib/swal"
import { computeTrailStatuses, indexBy, type TrailStatus } from "@/lib/utils"

const NO_PROGRESS: LessonProgress[] = []

interface Certification {
  /** `null` quando o curso não tem prova final. */
  examStatus: ExamStatus | null
  certificateCode: string | null
}

async function loadCertification(courseId: string): Promise<Certification> {
  const [examResult, certificate] = await Promise.all([
    toApiResult(fetchExamStatus(courseId)),
    fetchMyCertificate(courseId).catch(() => null),
  ])
  return {
    examStatus: examResult.ok ? examResult.data : null,
    certificateCode: certificate?.verification_code ?? null,
  }
}
interface UseCourseCompletionModalResult {
  isOpen: boolean
  close: () => void
}

/**
 * Abre o modal de curso concluído quando o aluno matriculado passa a ter todas as
 * lições concluídas, inclusive na primeira carga da página. Acompanha a transição
 * durante a renderização (padrão do React para derivar de valores anteriores).
 */
function useCourseCompletionModal(isAllDone: boolean, isEnrolled: boolean): UseCourseCompletionModalResult {
  const [wasAllDone, setWasAllDone] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  if (isAllDone !== wasAllDone) {
    setWasAllDone(isAllDone)
    if (isAllDone && isEnrolled) setIsOpen(true)
  }
  return { isOpen, close: () => setIsOpen(false) }
}
export interface UseCourseDetailResult {
  isLoading: boolean
  loadError: string | null
  course: Course | null
  lessons: Lesson[]
  statuses: TrailStatus[]
  completedCount: number
  isAllDone: boolean
  isEnrolled: boolean
  isEnrolling: boolean
  examStatus: ExamStatus | null
  certificateCode: string | null
  isEnrollAnimationOpen: boolean
  closeEnrollAnimation: () => void
  isCompleteModalOpen: boolean
  closeCompleteModal: () => void
  toggleEnrollment: () => Promise<void>
  downloadCertificate: () => Promise<void>
}

/** Dados da página do curso, matrícula e emissão do certificado. */
export function useCourseDetail(courseId: string): UseCourseDetailResult {
  const router = useRouter()
  const { profile, isLoading: isAuthLoading } = useAuth()
  const profileId = profile?.id
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isEnrollAnimationOpen, setIsEnrollAnimationOpen] = useState(false)

  const courseResource = useAsyncResource(() => fetchCourseWithLessons(courseId), [courseId], {
    errorMessage: () => "Não foi possível carregar o curso.",
  })
  const progressResource = useAsyncResource(
    () => (profileId ? fetchMyProgress().catch(() => NO_PROGRESS) : Promise.resolve(NO_PROGRESS)),
    [profileId],
  )

  const courseData = courseResource.status === "success" ? courseResource.data : null
  const lessons = courseData?.lessons ?? []
  const isEnrolled = courseData?.enrolled ?? false
  const progress = progressResource.status === "success" ? progressResource.data : NO_PROGRESS
  const statuses = computeTrailStatuses(lessons, indexBy(progress, (lessonProgress) => lessonProgress.lesson_id))
  const completedCount = statuses.filter((status) => status === "completed").length
  const isAllDone = lessons.length > 0 && completedCount === lessons.length
  const completionModal = useCourseCompletionModal(isAllDone, isEnrolled)

  const certificationResource = useAsyncResource(
    () => (profileId && isEnrolled ? loadCertification(courseId) : Promise.resolve(null)),
    [courseId, profileId, isEnrolled],
  )
  const certification = certificationResource.status === "success" ? certificationResource.data : null

  const setEnrolled = (enrolled: boolean): void =>
    courseResource.setData((current) => current && { ...current, enrolled })

  const toggleEnrollment = async (): Promise<void> => {
    if (!profile) {
      router.push(ROUTES.loginWithNext(ROUTES.course(courseId)))
      return
    }
    setIsEnrolling(true)
    try {
      if (isEnrolled) {
        const isConfirmed = await swalConfirm({
          title: "Cancelar matrícula?",
          text: "Seu progresso será mantido, mas você perderá o acesso às lições bloqueadas.",
          confirmText: "Cancelar matrícula",
          cancelText: "Manter matrícula",
          danger: true,
        })
        if (!isConfirmed) return
        await unenrollFromCourse(courseId)
        setEnrolled(false)
        swalToast({ title: "Matrícula cancelada.", icon: "info" })
      } else {
        await enrollInCourse(courseId)
        setEnrolled(true)
        setIsEnrollAnimationOpen(true)
      }
    } catch (error) {
      await swalError({ title: "Erro na matrícula", text: getErrorMessage(error, "Tente novamente em instantes.") })
    } finally {
      setIsEnrolling(false)
    }
  }

  const downloadCertificate = async (): Promise<void> => {
    if (!certification?.examStatus) {
      await swalError({
        title: "Certificado indisponível",
        text: "Este curso ainda não possui certificação oficial com prova final.",
      })
      return
    }
    if (certification.certificateCode) {
      window.open(certificatePdfUrl(certification.certificateCode), "_blank")
      return
    }
    swalToast({ title: "Emitindo certificado...", icon: "info" })
    const issueResult = await toApiResult(issueCertificate(courseId))
    if (!issueResult.ok) {
      await swalError({ title: "Certificado indisponível", text: issueResult.error.message })
      return
    }
    const { verificationCode } = issueResult.data
    certificationResource.setData((current) => current && { ...current, certificateCode: verificationCode })
    window.open(certificatePdfUrl(verificationCode), "_blank")
  }

  return {
    isLoading: isAuthLoading || courseResource.status === "loading" || progressResource.status === "loading",
    loadError: courseResource.status === "error" ? courseResource.error : null,
    course: courseData?.course ?? null,
    lessons,
    statuses,
    completedCount,
    isAllDone,
    isEnrolled,
    isEnrolling,
    examStatus: certification?.examStatus ?? null,
    certificateCode: certification?.certificateCode ?? null,
    isEnrollAnimationOpen,
    closeEnrollAnimation: () => setIsEnrollAnimationOpen(false),
    isCompleteModalOpen: completionModal.isOpen,
    closeCompleteModal: completionModal.close,
    toggleEnrollment,
    downloadCertificate,
  }
}

export type CourseDetail = ReturnType<typeof useCourseDetail>
