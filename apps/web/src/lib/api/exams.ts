import type {
  CertificateIssue, CertificateVerification, ExamResult, ExamStart, ExamStatus, ExamSubmitInput, MyCertificate,
} from "@levelusp/contracts"
import { api } from "./client"

export const fetchExamStatus = (courseId: string): Promise<ExamStatus> => api.get<ExamStatus>(`/courses/${courseId}/exam`)
export const startExam = (courseId: string): Promise<ExamStart> => api.post<ExamStart>(`/courses/${courseId}/exam/attempts`)
export const submitExam = (courseId: string, attemptId: string, answers: ExamSubmitInput["answers"]): Promise<ExamResult> =>
  api.post<ExamResult, ExamSubmitInput>(`/courses/${courseId}/exam/submit`, { attemptId, answers })
export const issueCertificate = (courseId: string): Promise<CertificateIssue> => api.post<CertificateIssue>(`/courses/${courseId}/certificate`)

export const fetchMyCertificate = (courseId: string): Promise<MyCertificate | null> => api.get<MyCertificate | null>(`/courses/${courseId}/certificate`)
export const fetchMyCertificates = (): Promise<MyCertificate[]> => api.get<MyCertificate[]>("/me/certificates")
/** Verificação pública (sem login) de um código de certificado. */
export const fetchCertificateVerification = (verificationCode: string): Promise<CertificateVerification> =>
  api.get<CertificateVerification>(`/certificates/${encodeURIComponent(verificationCode)}`)
export const certificatePdfUrl = (verificationCode: string): string =>
  `/api/certificates/${encodeURIComponent(verificationCode)}/pdf`
