import { Inject, Injectable, Logger } from "@nestjs/common"
import type { CertificateIssue, CertificateVerification, MyCertificate } from "@levelusp/contracts"
import { AppError, NotFound, ServiceUnavailable, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { AuditService } from "../audit/audit.service"
import { toIso } from "../exams/exams.mapper"
import { ExamsService } from "../exams/exams.service"
import { renderCertificatePdf } from "./certificate-pdf"
import { generateVerificationCode, normalizeCode, verificationUrl } from "./certificates.domain"
import { CertificatesRepository } from "./certificates.repository"

type SummaryRow = NonNullable<Awaited<ReturnType<CertificatesRepository["findByUserCourse"]>>>

function toMyCertificate(r: SummaryRow): MyCertificate {
  return {
    verification_code: r.verification_code,
    issued_at: toIso(r.issued_at),
    exam_score: Number(r.exam_score ?? 0),
    course_id: r.course_id,
    course_title: r.course_title,
  }
}

const MAX_CODE_RETRIES = 5

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name)

  constructor(
    private readonly repo: CertificatesRepository,
    private readonly exams: ExamsService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Emite o certificado se e somente se: todas as lições publicadas do curso
   * concluídas (inclui o projeto final) e prova final aprovada. Idempotente.
   */
  async issue(user: AuthUser, courseId: string): Promise<CertificateIssue> {
    const existing = await this.repo.findByUserCourse(user.id, courseId)
    if (existing) return toIssue(existing, true)

    const req = await this.exams.certificateRequirements(user, courseId)
    if (req.lessonsTotal === 0) throw Unprocessable("Este curso ainda não tem lições publicadas.", "NO_LESSONS")
    if (req.lessonsRemaining > 0) {
      throw new AppError(403, "NOT_ELIGIBLE", `Ainda faltam ${req.lessonsRemaining} lições para concluir o curso.`)
    }
    if (!req.hasExam) throw Unprocessable("Este curso não possui prova final.", "NO_EXAM")
    if (req.passedScore === null) throw new AppError(403, "EXAM_NOT_PASSED", "Você precisa ser aprovado na prova final.")

    for (let i = 0; i < MAX_CODE_RETRIES; i++) {
      const code = generateVerificationCode()
      const row = await this.repo.insert({ userId: user.id, courseId, verificationCode: code, examScore: req.passedScore })
      if (row) {
        await this.afterIssue(user, courseId, req.course.title, code, req.passedScore)
        return { issued: true, alreadyIssued: false, verificationCode: row.verificationCode, issuedAt: toIso(row.issuedAt), examScore: Number(row.examScore ?? 0) }
      }
      // Conflito: emissão concorrente do mesmo certificado ou colisão de código.
      const raced = await this.repo.findByUserCourse(user.id, courseId)
      if (raced) return toIssue(raced, true)
    }
    this.logger.error({ userId: user.id, courseId }, "não foi possível gerar código de certificado único")
    throw ServiceUnavailable("Não foi possível emitir o certificado agora. Tente novamente.", "CERTIFICATE_UNAVAILABLE")
  }

  async mine(user: AuthUser, courseId: string): Promise<MyCertificate | null> {
    const row = await this.repo.findByUserCourse(user.id, courseId)
    return row ? toMyCertificate(row) : null
  }

  async listMine(user: AuthUser): Promise<MyCertificate[]> {
    return (await this.repo.listByUser(user.id)).map(toMyCertificate)
  }

  /** Verificação pública: código inexistente → valid:false (sem erro). */
  async verify(rawCode: string): Promise<CertificateVerification> {
    const code = normalizeCode(rawCode)
    const row = code ? await this.repo.findByCode(code) : null
    if (!row) {
      return { valid: false, verification_code: code ?? "", student_name: null, course_title: null, issued_at: null, exam_score: null }
    }
    return {
      valid: true,
      verification_code: row.verificationCode,
      student_name: row.studentName,
      course_title: row.courseTitle,
      issued_at: toIso(row.issuedAt),
      exam_score: row.examScore === null ? null : Number(row.examScore),
    }
  }

  /** PDF oficial, público por código (o código é a credencial). */
  async pdf(rawCode: string): Promise<{ code: string; buffer: Buffer }> {
    const code = normalizeCode(rawCode)
    const row = code ? await this.repo.findByCode(code) : null
    if (!row) throw NotFound("Certificado")
    const buffer = await renderCertificatePdf({
      code: row.verificationCode,
      studentName: row.studentName || "Aluno(a) LevelUSP",
      courseTitle: row.courseTitle,
      issuedAt: toIso(row.issuedAt),
      examScore: Number(row.examScore ?? 0),
      projectStatus: row.projectStatus,
      verifyUrl: verificationUrl(this.env.APP_ORIGIN, row.verificationCode),
    })
    return { code: row.verificationCode, buffer }
  }

  /** Auditoria e notificação: melhor-esforço, nunca derrubam a emissão. */
  private async afterIssue(user: AuthUser, courseId: string, courseTitle: string, code: string, score: number) {
    await this.audit.log(user, "certificate.issued", courseId, { verification_code: code, exam_score: score, course_title: courseTitle })
    try {
      await this.repo.notify({
        userId: user.id,
        title: "Certificado emitido! 🎓",
        body: `Seu certificado de ${courseTitle} foi emitido com o código de verificação ${code}. Compartilhe e baixe o PDF quando quiser.`,
        kind: "success",
        href: `/certificado/${code}`,
      })
    } catch (err) {
      this.logger.warn({ err, userId: user.id, courseId }, "falha ao notificar emissão de certificado")
    }
  }
}

function toIssue(r: SummaryRow, alreadyIssued: boolean): CertificateIssue {
  return {
    issued: true,
    alreadyIssued,
    verificationCode: r.verification_code,
    issuedAt: toIso(r.issued_at),
    examScore: Number(r.exam_score ?? 0),
  }
}
