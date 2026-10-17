import { Injectable } from "@nestjs/common"
import { and, desc, eq, sql } from "drizzle-orm"
import { lessonProgress, lessons, submissions } from "@levelusp/db"
import type { GradeResult, LessonProgress, ProjectFile } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"

type ProgressRow = typeof lessonProgress.$inferSelect

export function toProgress(r: ProgressRow): LessonProgress {
  return {
    id: r.id,
    user_id: r.userId,
    lesson_id: r.lessonId,
    status: r.status,
    code_snapshot: r.codeSnapshot,
    score: r.score,
    xp_earned: r.xpEarned,
    completed_at: r.completedAt,
    created_at: r.createdAt,
  }
}

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

  async progressOf(userId: string): Promise<LessonProgress[]> {
    const rows = await this.db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId))
    return rows.map(toProgress)
  }

  async snapshot(userId: string, lessonId: string): Promise<string | null> {
    const row = await this.db.query.lessonProgress.findFirst({
      where: and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)),
      columns: { codeSnapshot: true },
    })
    return row?.codeSnapshot ?? null
  }

  /** Salva o código; não rebaixa lição concluída (o gatilho do banco também impede). */
  saveSnapshot(userId: string, lessonId: string, files: ProjectFile[]) {
    const json = JSON.stringify(files)
    return this.db
      .insert(lessonProgress)
      .values({ userId, lessonId, codeSnapshot: json, status: "in_progress" })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          codeSnapshot: json,
          status: sql`case when ${lessonProgress.status} = 'completed' then 'completed' else 'in_progress' end`,
        },
      })
  }

  async insertSubmission(s: {
    userId: string
    lessonId: string
    files: ProjectFile[]
    status: "graded" | "error"
    passed: boolean
    result: GradeResult | null
    engine: string | null
    durationMs: number | null
  }): Promise<string> {
    const [row] = await this.db.insert(submissions).values(s).returning({ id: submissions.id })
    return row!.id
  }

  recentSubmissions(userId: string, lessonId: string, limit = 10) {
    return this.db
      .select({ id: submissions.id, passed: submissions.passed, createdAt: submissions.createdAt, result: submissions.result })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), eq(submissions.lessonId, lessonId)))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
  }
}
