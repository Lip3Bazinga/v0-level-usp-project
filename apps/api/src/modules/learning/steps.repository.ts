import { Injectable } from "@nestjs/common"
import { and, count, eq, ne, sql } from "drizzle-orm"
import { enrollments, lessonProgress, lessonStepProgress, lessonSteps, lessons, type LessonRow, type LessonStepProgressRow } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"

/** O que as ações de passo precisam da lição (sem gabarito: o dos passos vem de `lesson_steps`). */
export type GuidedLessonRow = Pick<
  LessonRow,
  "id" | "lessonType" | "published" | "createdBy" | "courseId" | "runtime" | "libraries" | "isProject" | "solutionAfterAttempts" | "quizPassingScore"
>

/**
 * Leituras do progresso por passo e os contadores que não são conclusão (tentativas
 * reprovadas, dicas reveladas, solução vista). Concluir o passo e creditar XP é só do
 * `GamificationService`.
 */
@Injectable()
export class StepsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Lição com o que as ações de passo consultam. */
  findLesson(id: string): Promise<GuidedLessonRow | undefined> {
    return this.db.query.lessons.findFirst({
      where: eq(lessons.id, id),
      columns: {
        id: true, lessonType: true, published: true, createdBy: true, courseId: true, runtime: true, libraries: true,
        isProject: true, solutionAfterAttempts: true, quizPassingScore: true,
      },
    })
  }

  /** Situação do aluno na lição, ou `undefined` se nunca abriu. */
  async findLessonStatus(userId: string, lessonId: string): Promise<"not_started" | "in_progress" | "completed" | undefined> {
    const [progress] = await this.db
      .select({ status: lessonProgress.status })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)))
    return progress?.status
  }

  /** Progresso do aluno nos passos da lição (só os passos com que ele já interagiu). */
  async listProgress(userId: string, lessonId: string): Promise<LessonStepProgressRow[]> {
    const rows = await this.db
      .select({ progress: lessonStepProgress })
      .from(lessonStepProgress)
      .innerJoin(lessonSteps, eq(lessonSteps.id, lessonStepProgress.stepId))
      .where(and(eq(lessonStepProgress.userId, userId), eq(lessonSteps.lessonId, lessonId)))
    return rows.map((row) => row.progress)
  }

  /** Progresso do aluno num passo, ou `undefined` se nunca interagiu. */
  async findProgress(userId: string, stepId: string): Promise<LessonStepProgressRow | undefined> {
    const [progress] = await this.db
      .select()
      .from(lessonStepProgress)
      .where(and(eq(lessonStepProgress.userId, userId), eq(lessonStepProgress.stepId, stepId)))
    return progress
  }

  /** Soma uma verificação reprovada e devolve o total (passo já concluído não acumula). */
  async incrementAttempts(userId: string, stepId: string): Promise<number> {
    const rows = await this.db
      .insert(lessonStepProgress)
      .values({ userId, stepId, attempts: 1 })
      .onConflictDoUpdate({
        target: [lessonStepProgress.userId, lessonStepProgress.stepId],
        set: {
          attempts: sql`case when ${lessonStepProgress.status} = 'completed' then ${lessonStepProgress.attempts} else ${lessonStepProgress.attempts} + 1 end`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ attempts: lessonStepProgress.attempts })
    return requireRow(rows, "lesson_step_progress").attempts
  }

  /**
   * Revela a próxima dica de forma atômica: só soma enquanto `hints_revealed < hintCount`.
   * Devolve a posição (0 = primeira) da dica revelada, ou null quando não há mais dicas.
   */
  async revealNextHint(userId: string, stepId: string, hintCount: number): Promise<number | null> {
    if (hintCount <= 0) return null
    const rows = await this.db
      .insert(lessonStepProgress)
      .values({ userId, stepId, hintsRevealed: 1 })
      .onConflictDoUpdate({
        target: [lessonStepProgress.userId, lessonStepProgress.stepId],
        set: { hintsRevealed: sql`${lessonStepProgress.hintsRevealed} + 1`, updatedAt: sql`now()` },
        setWhere: sql`${lessonStepProgress.hintsRevealed} < ${hintCount}`,
      })
      .returning({ hintsRevealed: lessonStepProgress.hintsRevealed })
    const [row] = rows
    return row ? row.hintsRevealed - 1 : null
  }

  /** Marca que o aluno viu a solução antes de concluir (o XP do passo cai pela metade). */
  async markSolutionViewed(userId: string, stepId: string): Promise<void> {
    await this.db
      .insert(lessonStepProgress)
      .values({ userId, stepId, solutionViewed: true })
      .onConflictDoUpdate({
        target: [lessonStepProgress.userId, lessonStepProgress.stepId],
        set: { solutionViewed: true, updatedAt: sql`now()` },
        // Ver a solução de um passo já concluído não muda nada (o XP cheio já foi creditado).
        setWhere: sql`${lessonStepProgress.status} <> 'completed'`,
      })
  }

  /** Matrícula automática: interagir com um passo matricula o aluno no curso da lição. */
  async enroll(userId: string, courseId: string): Promise<void> {
    await this.db.insert(enrollments).values({ userId, courseId }).onConflictDoNothing()
  }

  /** Registra que o aluno começou a lição, sem rebaixar uma conclusão (rascunho e XP não mudam). */
  async markLessonStarted(userId: string, lessonId: string): Promise<void> {
    await this.db.insert(lessonProgress).values({ userId, lessonId, status: "in_progress" }).onConflictDoNothing()
  }

  /** Quantas lições publicadas do curso, fora os projetos e a própria lição, o aluno ainda não concluiu. */
  async countPendingLessonsBeforeProject(userId: string, courseId: string, projectLessonId: string): Promise<number> {
    const [pending] = await this.db
      .select({ total: count() })
      .from(lessons)
      .where(
        and(
          eq(lessons.courseId, courseId),
          eq(lessons.published, true),
          eq(lessons.isProject, false),
          ne(lessons.id, projectLessonId),
          sql`not exists (select 1 from lesson_progress p where p.lesson_id = ${lessons.id} and p.user_id = ${userId} and p.status = 'completed')`,
        ),
      )
    return pending?.total ?? 0
  }
}
