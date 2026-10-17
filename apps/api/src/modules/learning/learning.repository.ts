import { Injectable } from "@nestjs/common"
import { and, eq, sql } from "drizzle-orm"
import { lessonProgress, lessons, submissions, type SubmissionInsert } from "@levelusp/db"
import type { ProjectFile } from "@levelusp/contracts"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"

@Injectable()
export class LearningRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Lição para correção: inclui test_cases (nunca serializar para o cliente). */
  findLessonForGrading(id: string) {
    return this.db.query.lessons.findFirst({
      where: eq(lessons.id, id),
      columns: { id: true, lessonType: true, published: true, createdBy: true, testCases: true, timeLimit: true, xpReward: true, courseId: true },
    })
  }

  progressOf(userId: string) {
    return this.db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId))
  }

  async snapshot(userId: string, lessonId: string): Promise<string | null> {
    const progress = await this.db.query.lessonProgress.findFirst({
      where: and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
      columns: { codeSnapshot: true },
    })
    return progress?.codeSnapshot ?? null
  }

  /** Salva o código; não rebaixa lição concluída (o gatilho do banco também impede). */
  async saveSnapshot(userId: string, lessonId: string, files: ProjectFile[]): Promise<void> {
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

  async insertSubmission(submission: SubmissionInsert): Promise<string> {
    return requireRow(await this.db.insert(submissions).values(submission).returning({ id: submissions.id }), "submissions").id
  }
}
