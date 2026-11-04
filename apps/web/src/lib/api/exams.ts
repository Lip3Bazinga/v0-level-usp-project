import type {
  CertificateIssue, CertificateVerification, ExamResult, ExamStart, ExamStatus, ExamSubmitInput, MyCertificate,
} from "@levelusp/contracts"
import { api } from "./client"

export const fetchExamStatus = (courseId: string) => api.get<ExamStatus>(`/courses/${courseId}/exam`)
export const startExam = (courseId: string) => api.post<ExamStart>(`/courses/${courseId}/exam/attempts`)
export const submitExam = (courseId: string, attemptId: string, answers: ExamSubmitInput["answers"]) =>
  api.post<ExamResult, ExamSubmitInput>(`/courses/${courseId}/exam/submit`, { attemptId, answers })
export const issueCertificate = (courseId: string) => api.post<CertificateIssue>(`/courses/${courseId}/certificate`)

export const fetchMyCertificate = (courseId: string) => api.get<MyCertificate | null>(`/courses/${courseId}/certificate`)
export const fetchMyCertificates = () => api.get<MyCertificate[]>("/me/certificates")
/** Verificação pública (sem login) de um código de certificado. */
export const fetchCertificateVerification = (verificationCode: string) =>
  api.get<CertificateVerification>(`/certificates/${encodeURIComponent(verificationCode)}`)
export const certificatePdfUrl = (verificationCode: string) =>
  `/api/certificates/${encodeURIComponent(verificationCode)}/pdf`
