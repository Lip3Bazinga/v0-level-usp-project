import { Injectable } from "@nestjs/common"
import { asc, eq } from "drizzle-orm"
import { lessonQuizQuestions, lessons } from "@levelusp/db"
import type { QuizQuestionInput } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"

@Injectable()
export class QuizzesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findLesson(id: string) {
    return this.db.query.lessons.findFirst({
      where: eq(lessons.id, id),
      columns: { id: true, lessonType: true, published: true, createdBy: true, quizPassingScore: true },
    })
  }

  /** Questões COM gabarito (só para correção e para o professor dono). */
  questions(lessonId: string) {
    return this.db
      .select()
      .from(lessonQuizQuestions)
      .where(eq(lessonQuizQuestions.lessonId, lessonId))
      .orderBy(asc(lessonQuizQuestions.sortOrder), asc(lessonQuizQuestions.createdAt))
  }

  /** Questões sem gabarito (para o aluno) — correct_index nem é lido. */
  publicQuestions(lessonId: string) {
    return this.db
      .select({ id: lessonQuizQuestions.id, prompt: lessonQuizQuestions.prompt, options: lessonQuizQuestions.options })
      .from(lessonQuizQuestions)
      .where(eq(lessonQuizQuestions.lessonId, lessonId))
      .orderBy(asc(lessonQuizQuestions.sortOrder), asc(lessonQuizQuestions.createdAt))
  }

  /** Substitui todas as questões numa transação; sort_order = posição na lista. */
  replace(lessonId: string, questions: QuizQuestionInput[]) {
    return this.db.transaction(async (tx) => {
      await tx.delete(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))
      if (!questions.length) return []
      const rows = await tx
        .insert(lessonQuizQuestions)
        .values(
          questions.map((q, i) => ({
            lessonId,
            prompt: q.prompt,
            options: q.options,
            correctIndex: q.correct_index,
            explanation: q.explanation,
            sortOrder: i,
          })),
        )
        .returning()
      return rows.sort((a, b) => a.sortOrder - b.sortOrder)
    })
  }
}
