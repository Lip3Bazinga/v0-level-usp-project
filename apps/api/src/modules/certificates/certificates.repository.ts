import { Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { certificates, courses, profiles } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { CertificateSummaryRow, PublicCertificateRow } from "./certificates.mapper"

const summaryColumns = {
  verificationCode: certificates.verificationCode,
  issuedAt: certificates.issuedAt,
  examScore: certificates.examScore,
  courseId: certificates.courseId,
  courseTitle: courses.title,
}

export interface NewCertificate {
  userId: string
  courseId: string
  verificationCode: string
  examScore: number
}

@Injectable()
export class CertificatesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  async findByUserCourse(userId: string, courseId: string): Promise<CertificateSummaryRow | null> {
    const [certificate] = await this.db
      .select(summaryColumns)
      .from(certificates)
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
      .limit(1)
    return certificate ?? null
  }

  listByUser(userId: string): Promise<CertificateSummaryRow[]> {
    return this.db
      .select(summaryColumns)
      .from(certificates)
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.userId, userId))
      .orderBy(desc(certificates.issuedAt))
  }

  /**
   * Insere o certificado. Em conflito (código repetido ou já emitido para o
   * par aluno+curso) não insere e devolve null — o service decide o que fazer.
   */
  async create(certificate: NewCertificate) {
    const [inserted] = await this.db
      .insert(certificates)
      .values({ ...certificate, projectStatus: "passed" })
      .onConflictDoNothing()
      .returning({ verificationCode: certificates.verificationCode, issuedAt: certificates.issuedAt, examScore: certificates.examScore })
    return inserted ?? null
  }

  /** Verificação pública: só nome, curso, data, nota e situação do projeto. */
  async findByCode(code: string): Promise<PublicCertificateRow | null> {
    const [certificate] = await this.db
      .select({
        verificationCode: certificates.verificationCode,
        studentName: profiles.fullName,
        courseTitle: courses.title,
        issuedAt: certificates.issuedAt,
        examScore: certificates.examScore,
        projectStatus: certificates.projectStatus,
      })
      .from(certificates)
      .innerJoin(profiles, eq(profiles.id, certificates.userId))
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.verificationCode, code))
      .limit(1)
    return certificate ?? null
  }
}
