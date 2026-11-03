import { Injectable } from "@nestjs/common"
import { asc, eq } from "drizzle-orm"
import { lessonQuizQuestions, lessons } from "@levelusp/db"
import type { QuizQuestionInput } from "@levelusp/contracts"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { DbTransaction, LessonRow, LessonQuizQuestionRow } from "@levelusp/db"

const quizOrder = [asc(lessonQuizQuestions.sortOrder), asc(lessonQuizQuestions.createdAt)]

/** O que o questionário precisa da lição: visibilidade, tipo e nota mínima. */
export type QuizLessonRow = Pick<LessonRow, "id" | "published" | "createdBy" | "lessonType" | "quizPassingScore">

@Injectable()
export class QuizzesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findLesson(id: string): Promise<QuizLessonRow | undefined> {
    return this.db.query.lessons.findFirst({
      where: eq(lessons.id, id),
      columns: { id: true, lessonType: true, published: true, createdBy: true, quizPassingScore: true },
    })
  }

  /** Questões COM gabarito (só para correção e para o professor dono). */
  listQuestions(lessonId: string): Promise<LessonQuizQuestionRow[]> {
    return this.db.select().from(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId)).orderBy(...quizOrder)
  }

  /** Questões sem gabarito (para o aluno) — correct_index nem é lido. */
  listPublicQuestions(lessonId: string): Promise<Pick<LessonQuizQuestionRow, "id" | "prompt" | "options">[]> {
    return this.db
      .select({ id: lessonQuizQuestions.id, prompt: lessonQuizQuestions.prompt, options: lessonQuizQuestions.options })
      .from(lessonQuizQuestions)
      .where(eq(lessonQuizQuestions.lessonId, lessonId))
      .orderBy(...quizOrder)
  }

  /** Substitui todas as questões numa transação; sort_order = posição na lista. */
  replaceQuestions(lessonId: string, questions: QuizQuestionInput[]): Promise<LessonQuizQuestionRow[]> {
    return this.db.transaction(async (tx: DbTransaction) => {
      await tx.delete(lessonQuizQuestions).where(eq(lessonQuizQuestions.lessonId, lessonId))
      if (!questions.length) return []
      const inserted = await tx
        .insert(lessonQuizQuestions)
        .values(
          questions.map((question, position) => ({
            lessonId,
            prompt: question.prompt,
            options: question.options,
            correctIndex: question.correct_index,
            explanation: question.explanation,
            sortOrder: position,
          })),
        )
        .returning()
      return inserted.sort((first, second) => first.sortOrder - second.sortOrder)
    })
  }
}
