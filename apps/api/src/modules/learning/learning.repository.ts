import { Injectable } from "@nestjs/common"
import { and, eq, sql } from "drizzle-orm"
import { lessonProgress, lessons, submissions, type SubmissionInsert } from "@levelusp/db"
import type { ProjectFile } from "@levelusp/contracts"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { LessonProgressRow, LessonRow } from "@levelusp/db"

/** Lição com o gabarito (`testCases`) e o que a correção e o crédito de XP precisam. */
export type GradableLessonRow = Pick<
  LessonRow,
  "id" | "lessonType" | "published" | "createdBy" | "testCases" | "timeLimit" | "xpReward" | "courseId"
>

/** Progresso do aluno, rascunhos de código e submissões. */
@Injectable()
export class LearningRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Lição para correção: inclui test_cases (nunca serializar para o cliente). */
  findLessonForGrading(id: string): Promise<GradableLessonRow | undefined> {
    return this.db.query.lessons.findFirst({
      where: eq(lessons.id, id),
      columns: { id: true, lessonType: true, published: true, createdBy: true, testCases: true, timeLimit: true, xpReward: true, courseId: true },
    })
  }

  /** Progresso do aluno em todas as lições. */
  listProgress(userId: string): Promise<LessonProgressRow[]> {
    return this.db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId))
  }

  /** Rascunho salvo (JSON dos arquivos), ou null. */
  async findSnapshot(userId: string, lessonId: string): Promise<string | null> {
    const progress = await this.db.query.lessonProgress.findFirst({
      where: and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
      columns: { codeSnapshot: true },
    })
    return progress?.codeSnapshot ?? null
  }

  /** Salva o código; não rebaixa lição concluída (o gatilho do banco também impede). */
  async upsertSnapshot(userId: string, lessonId: string, files: ProjectFile[]): Promise<void> {
    const codeSnapshot = JSON.stringify(files)
    await this.db
      .insert(lessonProgress)
      .values({ userId, lessonId, codeSnapshot, status: "in_progress" })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          codeSnapshot,
          status: sql`case when ${lessonProgress.status} = 'completed' then 'completed' else 'in_progress' end`,
        },
      })
  }

  /** Grava a submissão e devolve o id. */
  async createSubmission(submission: SubmissionInsert): Promise<string> {
    return requireRow(await this.db.insert(submissions).values(submission).returning({ id: submissions.id }), "submissions").id
  }
}
