import type {
  CertificateIssue, CertificateVerification, ExamResult, ExamStart, ExamStatus, ExamSubmitInput, MyCertificate,
} from "@levelusp/contracts"
import { api } from "./client"

/** Situação do aluno na prova final do curso (nunca traz questões). */
export const fetchExamStatus = (courseId: string): Promise<ExamStatus> => api.get<ExamStatus>(`/courses/${courseId}/exam`)
/** Inicia uma tentativa ou retoma a que está aberta. */
export const startExam = (courseId: string): Promise<ExamStart> => api.post<ExamStart>(`/courses/${courseId}/exam/attempts`)
/** Entrega as respostas; a correção é feita na API. */
export const submitExam = (courseId: string, attemptId: string, answers: ExamSubmitInput["answers"]): Promise<ExamResult> =>
  api.post<ExamResult, ExamSubmitInput>(`/courses/${courseId}/exam/submit`, { attemptId, answers })
/** Emite o certificado (idempotente: a segunda chamada devolve o mesmo). */
export const issueCertificate = (courseId: string): Promise<CertificateIssue> => api.post<CertificateIssue>(`/courses/${courseId}/certificate`)

/** Certificado do usuário no curso, ou null se ainda não foi emitido. */
export const fetchMyCertificate = (courseId: string): Promise<MyCertificate | null> => api.get<MyCertificate | null>(`/courses/${courseId}/certificate`)
/** Certificados do usuário. */
export const fetchMyCertificates = (): Promise<MyCertificate[]> => api.get<MyCertificate[]>("/me/certificates")
/** Verificação pública (sem login) de um código de certificado. */
export const fetchCertificateVerification = (verificationCode: string): Promise<CertificateVerification> =>
  api.get<CertificateVerification>(`/certificates/${encodeURIComponent(verificationCode)}`)
/** URL pública do PDF do certificado (o código é a credencial). */
export const certificatePdfUrl = (verificationCode: string): string =>
  `/api/certificates/${encodeURIComponent(verificationCode)}/pdf`
