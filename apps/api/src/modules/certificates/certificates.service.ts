import { Inject, Injectable, Logger } from "@nestjs/common"
import type { CertificateIssue, CertificateVerification, MyCertificate } from "@levelusp/contracts"
import { Forbidden, NotFound, ServiceUnavailable, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { toIsoTimestamp } from "@/common/time/time"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { AuditService } from "../audit/audit.service"
import { ExamsService, type CertificateRequirements } from "../exams/exams.service"
import { NotificationsService } from "../notifications/notifications.service"
import { renderCertificatePdf } from "./certificate-pdf"
import { generateVerificationCode, normalizeCode, verificationUrl } from "./certificates.domain"
import { invalidVerification, toCertificateIssue, toMyCertificate, toVerification } from "./certificates.mapper"
import { CertificatesRepository } from "./certificates.repository"

const MAX_CODE_RETRIES = 5
const FALLBACK_STUDENT_NAME = "Aluno(a) LevelUSP"

interface IssuedCertificate {
  courseId: string
  courseTitle: string
  code: string
  score: number
}

export interface CertificatePdf {
  code: string
  buffer: Buffer
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name)

  constructor(
    private readonly repo: CertificatesRepository,
    private readonly exams: ExamsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Emite o certificado se e somente se: todas as lições publicadas do curso
   * concluídas (inclui o projeto final) e prova final aprovada. Idempotente.
   */
  async issue(user: AuthUser, courseId: string): Promise<CertificateIssue> {
    const existing = await this.repo.findByUserCourse(user.id, courseId)
    if (existing) return toCertificateIssue(existing, true)

    const requirements = await this.exams.getCertificateRequirements(user, courseId)
    const passedScore = this.assertEligible(requirements)

    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const code = generateVerificationCode()
      const inserted = await this.repo.create({ userId: user.id, courseId, verificationCode: code, examScore: passedScore })
      if (inserted) {
        await this.afterIssue(user, { courseId, courseTitle: requirements.course.title, code, score: passedScore })
        return toCertificateIssue(inserted, false)
      }
      // Conflito: emissão concorrente do mesmo certificado ou colisão de código.
      const raced = await this.repo.findByUserCourse(user.id, courseId)
      if (raced) return toCertificateIssue(raced, true)
    }
    this.logger.error({ userId: user.id, courseId }, "não foi possível gerar código de certificado único")
    throw ServiceUnavailable("Não foi possível emitir o certificado agora. Tente novamente.", "CERTIFICATE_UNAVAILABLE")
  }

  async findMyCertificate(user: AuthUser, courseId: string): Promise<MyCertificate | null> {
    const certificate = await this.repo.findByUserCourse(user.id, courseId)
    return certificate ? toMyCertificate(certificate) : null
  }

  async listMyCertificates(user: AuthUser): Promise<MyCertificate[]> {
    return (await this.repo.listByUser(user.id)).map(toMyCertificate)
  }

  /** Verificação pública: código inexistente → valid:false (sem erro). */
  async verify(rawCode: string): Promise<CertificateVerification> {
    const code = normalizeCode(rawCode)
    const certificate = code ? await this.repo.findByCode(code) : null
    return certificate ? toVerification(certificate) : invalidVerification(code ?? "")
  }

  /** PDF oficial, público por código (o código é a credencial). */
  async getPdf(rawCode: string): Promise<CertificatePdf> {
    const code = normalizeCode(rawCode)
    const certificate = code ? await this.repo.findByCode(code) : null
    if (!certificate) throw NotFound("Certificado")
    const buffer = await renderCertificatePdf({
      code: certificate.verificationCode,
      studentName: certificate.studentName || FALLBACK_STUDENT_NAME,
      courseTitle: certificate.courseTitle,
      issuedAt: toIsoTimestamp(certificate.issuedAt),
      examScore: Number(certificate.examScore ?? 0),
      projectStatus: certificate.projectStatus,
      verifyUrl: verificationUrl(this.env.PUBLIC_BASE_URL, certificate.verificationCode),
    })
    return { code: certificate.verificationCode, buffer }
  }

  /** Devolve a nota da prova que vai no certificado. */
  private assertEligible(requirements: CertificateRequirements): number {
    if (requirements.lessonsTotal === 0) throw Unprocessable("Este curso ainda não tem lições publicadas.", "NO_LESSONS")
    if (requirements.lessonsRemaining > 0) {
      throw Forbidden(`Ainda faltam ${requirements.lessonsRemaining} lições para concluir o curso.`, "NOT_ELIGIBLE")
    }
    if (!requirements.hasExam) throw Unprocessable("Este curso não possui prova final.", "NO_EXAM")
    if (requirements.passedScore === null) throw Forbidden("Você precisa ser aprovado na prova final.", "EXAM_NOT_PASSED")
    return requirements.passedScore
  }

  /** Auditoria e notificação: melhor-esforço, nunca derrubam a emissão. */
  private async afterIssue(user: AuthUser, { courseId, courseTitle, code, score }: IssuedCertificate): Promise<void> {
    await this.audit.log(user, "certificate.issued", courseId, { verification_code: code, exam_score: score, course_title: courseTitle })
    try {
      await this.notifications.notify(user.id, {
        title: "Certificado emitido! 🎓",
        body: `Seu certificado de ${courseTitle} foi emitido com o código de verificação ${code}. Compartilhe e baixe o PDF quando quiser.`,
        kind: "success",
        href: `/certificado/${code}`,
      })
    } catch (error) {
      this.logger.warn({ err: error, userId: user.id, courseId }, "falha ao notificar emissão de certificado")
    }
  }
}
