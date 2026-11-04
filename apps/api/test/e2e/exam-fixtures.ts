import { courses, examQuestions, exams } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { GamificationService } from "@/modules/gamification/gamification.service"
import { createLesson, required, type TestContext } from "./harness"

const OPTION_COUNT = 4

export interface ExamFixture {
  courseId: string
  examId: string
  lessonIds: string[]
  /** questionId → índice correto (só o teste conhece o gabarito). */
  answerKey: Map<string, number>
}

export interface ExamFixtureOptions {
  lessons?: number
  questions?: number
  questionsPerAttempt?: number | null
  cooldownMinutes?: number
  passingScore?: number
  title?: string
}

/** Curso publicado com lições, prova ativa e banco de questões. */
export async function seedCourseWithExam(ctx: TestContext, options: ExamFixtureOptions = {}): Promise<ExamFixture> {
  const course = requireRow(await ctx.db.insert(courses).values({ title: options.title ?? "Python do Zero", published: true }).returning(), "courses")
  const lessonIds: string[] = []
  for (let index = 0; index < (options.lessons ?? 2); index++) {
    const lesson = await createLesson(ctx.db, { title: `Lição ${index + 1}`, courseId: course.id, lessonType: "theory", order: index + 1 })
    lessonIds.push(lesson.id)
  }
  const exam = requireRow(
    await ctx.db
      .insert(exams)
      .values({
        courseId: course.id,
        title: "Prova final",
        description: "Prova do curso",
        passingScore: options.passingScore ?? 70,
        timeLimitMinutes: 45,
        cooldownMinutes: options.cooldownMinutes ?? 60,
        questionsPerAttempt: options.questionsPerAttempt ?? null,
      })
      .returning(),
    "exams",
  )
  const answerKey = new Map<string, number>()
  for (let index = 0; index < (options.questions ?? 4); index++) {
    const correctIndex = index % 3
    const question = requireRow(
      await ctx.db
        .insert(examQuestions)
        .values({ examId: exam.id, prompt: `Questão ${index + 1}`, options: ["a", "b", "c", "d"], correctIndex, explanation: `Explicação ${index + 1}`, sortOrder: index })
        .returning(),
      "exam_questions",
    )
    answerKey.set(question.id, correctIndex)
  }
  return { courseId: course.id, examId: exam.id, lessonIds, answerKey }
}

/** Conclui as lições pelo caminho oficial (GamificationService). */
export async function completeLessons(ctx: TestContext, userId: string, lessonIds: string[]): Promise<void> {
  const gamification = ctx.app.get(GamificationService)
  for (const lessonId of lessonIds) await gamification.completeLesson(userId, lessonId)
}

export function correctAnswer(answerKey: Map<string, number>, questionId: string): number {
  return required(answerKey.get(questionId), `gabarito da questão ${questionId}`)
}

export function wrongAnswer(answerKey: Map<string, number>, questionId: string): number {
  return (correctAnswer(answerKey, questionId) + 1) % OPTION_COUNT
}

export function answersFor(questionIds: string[], answerKey: Map<string, number>, correct: boolean): Record<string, number> {
  return Object.fromEntries(questionIds.map((id) => [id, correct ? correctAnswer(answerKey, id) : wrongAnswer(answerKey, id)]))
}

/** Ids das questões sorteadas, na ordem em que a tentativa as apresenta. */
export function drawnQuestionIds(attempt: { questions: { id: string }[] }): string[] {
  return attempt.questions.map((question) => question.id)
}

/** Erra de propósito as questões indicadas, mantendo as demais respostas. */
export function missQuestions(answers: Record<string, number>, answerKey: Map<string, number>, questionIds: readonly string[]): Record<string, number> {
  return { ...answers, ...Object.fromEntries(questionIds.map((id) => [id, wrongAnswer(answerKey, id)])) }
}
