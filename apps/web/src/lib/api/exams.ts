import type { CertificateIssue, CertificateVerification, ExamResult, ExamStart, ExamStatus, MyCertificate } from "@levelusp/contracts"
import { api, ApiError } from "./client"

export type { CertificateIssue, ExamResult, ExamStart, ExamStatus, MyCertificate }

/** Mesmo formato do cliente antigo: a tela trata `ok/status/error`. */
export type ExamResponse<T> = { ok: true; data: T } | { ok: false; status: number; error: string; code?: string }

async function wrap<T>(p: Promise<T>): Promise<ExamResponse<T>> {
  try {
    return { ok: true, data: await p }
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, status: err.status, error: err.message, code: err.code }
    return { ok: false, status: 0, error: "Erro de conexão. Verifique sua internet." }
  }
}

export const fetchExamStatus = (courseId: string) => wrap(api.get<ExamStatus>(`/courses/${courseId}/exam`))
export const startExam = (courseId: string) => wrap(api.post<ExamStart>(`/courses/${courseId}/exam/attempts`))
export const submitExam = (courseId: string, attemptId: string, answers: Record<string, number>) =>
  wrap(api.post<ExamResult>(`/courses/${courseId}/exam/submit`, { attemptId, answers }))
export const issueCertificate = (courseId: string) => wrap(api.post<CertificateIssue>(`/courses/${courseId}/certificate`))

export const fetchMyCertificate = (courseId: string) => api.get<MyCertificate | null>(`/courses/${courseId}/certificate`)
export const fetchMyCertificates = () => api.get<MyCertificate[]>("/me/certificates")
export const verifyCertificate = (code: string) => api.get<CertificateVerification>(`/certificates/${encodeURIComponent(code)}`)
export const certificatePdfUrl = (code: string) => `/api/certificates/${encodeURIComponent(code)}/pdf`
