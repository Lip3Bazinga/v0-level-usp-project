import { Injectable } from "@nestjs/common"
import { and, asc, count, eq, gt, inArray } from "drizzle-orm"
import { lessonSteps, type DbExecutor, type LessonStepInsert, type LessonStepRow } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

/**
 * Passos das lições guiadas. As linhas vêm COM o gabarito (`solutionFiles`, `testCases`,
 * `quizQuestions.correct_index`): quem responde ao aluno converte com `toLessonStep`.
 */
@Injectable()
export class LessonStepsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Passos da lição, na ordem. */
  listByLesson(lessonId: string, executor: DbExecutor = this.db): Promise<LessonStepRow[]> {
    return executor.select().from(lessonSteps).where(eq(lessonSteps.lessonId, lessonId)).orderBy(asc(lessonSteps.order))
  }

  /** Passos de várias lições, por lição e ordem (para listagens). */
  listByLessons(lessonIds: string[], executor: DbExecutor = this.db): Promise<LessonStepRow[]> {
    if (lessonIds.length === 0) return Promise.resolve([])
    return executor.select().from(lessonSteps).where(inArray(lessonSteps.lessonId, lessonIds)).orderBy(asc(lessonSteps.lessonId), asc(lessonSteps.order))
  }

  /** Um passo da lição, ou `undefined` (o passo de outra lição não é encontrado). */
  async findInLesson(lessonId: string, stepId: string, executor: DbExecutor = this.db): Promise<LessonStepRow | undefined> {
    const [step] = await executor.select().from(lessonSteps).where(and(eq(lessonSteps.id, stepId), eq(lessonSteps.lessonId, lessonId))).limit(1)
    return step
  }

  /** Quantos passos a lição tem. */
  async countByLesson(lessonId: string, executor: DbExecutor = this.db): Promise<number> {
    const [steps] = await executor.select({ total: count() }).from(lessonSteps).where(eq(lessonSteps.lessonId, lessonId))
    return steps?.total ?? 0
  }

  /**
   * Substitui os passos da lição. Cada passo é gravado pela chave (lição, ordem), o que
   * preserva o id (o progresso e as submissões dos alunos apontam para ele); os que
   * sobram além do novo tamanho são apagados.
   */
  async replaceAll(lessonId: string, steps: LessonStepInsert[], executor: DbExecutor = this.db): Promise<void> {
    for (const step of steps) {
      await executor.insert(lessonSteps).values(step).onConflictDoUpdate({ target: [lessonSteps.lessonId, lessonSteps.order], set: step })
    }
    await executor.delete(lessonSteps).where(and(eq(lessonSteps.lessonId, lessonId), gt(lessonSteps.order, steps.length)))
  }
}
