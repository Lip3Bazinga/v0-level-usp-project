import { Injectable } from "@nestjs/common"
import { and, desc, eq } from "drizzle-orm"
import { certificates, courses, notifications, profiles } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

const summaryColumns = {
  verification_code: certificates.verificationCode,
  issued_at: certificates.issuedAt,
  exam_score: certificates.examScore,
  course_id: certificates.courseId,
  course_title: courses.title,
}

@Injectable()
export class CertificatesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  async findByUserCourse(userId: string, courseId: string) {
    const [row] = await this.db
      .select(summaryColumns)
      .from(certificates)
      .innerJoin(courses, eq(courses.id, certificates.courseId))
      .where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId)))
      .limit(1)
    return row ?? null
  }

  listByUser(userId: string) {
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
  async insert(values: { userId: string; courseId: string; verificationCode: string; examScore: number }) {
    const [row] = await this.db
      .insert(certificates)
      .values({ ...values, projectStatus: "passed" })
      .onConflictDoNothing()
      .returning({ verificationCode: certificates.verificationCode, issuedAt: certificates.issuedAt, examScore: certificates.examScore })
    return row ?? null
  }

  /** Verificação pública: só nome, curso, data, nota e situação do projeto. */
  async findByCode(code: string) {
    const [row] = await this.db
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
    return row ?? null
  }

  async notify(n: typeof notifications.$inferInsert) {
    await this.db.insert(notifications).values(n)
  }
}
