import { courses, examQuestions, exams } from "@levelusp/db"
import { GamificationService } from "@/modules/gamification/gamification.service"
import { createLesson, type TestContext } from "./harness"

export interface ExamFixture {
  courseId: string
  examId: string
  lessonIds: string[]
  /** questionId → índice correto (só o teste conhece o gabarito). */
  answerKey: Map<string, number>
}

/** Curso publicado com lições, prova ativa e banco de questões. */
export async function seedCourseWithExam(
  ctx: TestContext,
  opts: { lessons?: number; questions?: number; questionsPerAttempt?: number | null; cooldownMinutes?: number; passingScore?: number; title?: string } = {},
): Promise<ExamFixture> {
  const [course] = await ctx.db.insert(courses).values({ title: opts.title ?? "Python do Zero", published: true }).returning()
  const lessonIds: string[] = []
  for (let i = 0; i < (opts.lessons ?? 2); i++) {
    const l = await createLesson(ctx.db, { title: `Lição ${i + 1}`, courseId: course!.id, lessonType: "theory", order: i + 1 })
    lessonIds.push(l.id)
  }
  const [exam] = await ctx.db
    .insert(exams)
    .values({
      courseId: course!.id,
      title: "Prova final",
      description: "Prova do curso",
      passingScore: opts.passingScore ?? 70,
      timeLimitMinutes: 45,
      cooldownMinutes: opts.cooldownMinutes ?? 60,
      questionsPerAttempt: opts.questionsPerAttempt ?? null,
    })
    .returning()
  const answerKey = new Map<string, number>()
  for (let i = 0; i < (opts.questions ?? 4); i++) {
    const correct = i % 3
    const [q] = await ctx.db
      .insert(examQuestions)
      .values({ examId: exam!.id, prompt: `Questão ${i + 1}`, options: ["a", "b", "c", "d"], correctIndex: correct, explanation: `Explicação ${i + 1}`, sortOrder: i })
      .returning()
    answerKey.set(q!.id, correct)
  }
  return { courseId: course!.id, examId: exam!.id, lessonIds, answerKey }
}

/** Conclui as lições pelo caminho oficial (GamificationService). */
export async function completeLessons(ctx: TestContext, userId: string, lessonIds: string[]) {
  const gamification = ctx.app.get(GamificationService)
  for (const id of lessonIds) await gamification.completeLesson(userId, id)
}

export function answersFor(questionIds: string[], key: Map<string, number>, correct: boolean): Record<string, number> {
  return Object.fromEntries(questionIds.map((id) => [id, correct ? key.get(id)! : (key.get(id)! + 1) % 4]))
}
