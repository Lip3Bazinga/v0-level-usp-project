import type { CertificateIssue, CertificateVerification, MyCertificate } from "@levelusp/contracts"
import { toIsoTimestamp } from "@/common/time/time"
import type { CertificateProjectStatus } from "@levelusp/db"

/** Certificado do aluno com o curso. */
export interface CertificateSummaryRow {
  verificationCode: string
  issuedAt: string
  examScore: number | null
  courseId: string
  courseTitle: string
}

/** Certificado com o nome do aluno, para a verificação pública e o PDF. */
export interface PublicCertificateRow {
  verificationCode: string
  studentName: string
  courseTitle: string
  issuedAt: string
  examScore: number | null
  projectStatus: CertificateProjectStatus
}

/** Certificado do aluno no formato do contrato. */
export function toMyCertificate(certificate: CertificateSummaryRow): MyCertificate {
  return {
    verification_code: certificate.verificationCode,
    issued_at: toIsoTimestamp(certificate.issuedAt),
    exam_score: Number(certificate.examScore ?? 0),
    course_id: certificate.courseId,
    course_title: certificate.courseTitle,
  }
}

/** Resposta da emissão; `alreadyIssued` diferencia a primeira emissão das repetidas. */
export function toCertificateIssue(certificate: Pick<CertificateSummaryRow, "verificationCode" | "issuedAt" | "examScore">, alreadyIssued: boolean): CertificateIssue {
  return {
    issued: true,
    alreadyIssued,
    verificationCode: certificate.verificationCode,
    issuedAt: toIsoTimestamp(certificate.issuedAt),
    examScore: Number(certificate.examScore ?? 0),
  }
}

/** Verificação pública: só nome, curso, data, nota e situação (nunca o e-mail). */
export function toVerification(certificate: PublicCertificateRow): CertificateVerification {
  return {
    valid: true,
    verification_code: certificate.verificationCode,
    student_name: certificate.studentName,
    course_title: certificate.courseTitle,
    issued_at: toIsoTimestamp(certificate.issuedAt),
    exam_score: certificate.examScore === null ? null : Number(certificate.examScore),
  }
}

/** Código inexistente responde `valid: false` (sem erro), ecoando o código normalizado. */
export function invalidVerification(code: string): CertificateVerification {
  return { valid: false, verification_code: code, student_name: null, course_title: null, issued_at: null, exam_score: null }
}
