import { Injectable, Logger } from "@nestjs/common"
import type { QuizQuestionFull, QuizQuestionInput, QuizQuestionPublic, QuizResult } from "@levelusp/contracts"
import { Forbidden, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { canManage, canView } from "../catalog/catalog.domain"
import { GamificationService } from "../gamification/gamification.service"
import { gradeQuiz } from "./quizzes.domain"
import { toQuizQuestionFull, toQuizQuestionPublic } from "./quizzes.mapper"
import { QuizzesRepository } from "./quizzes.repository"

/** 10 envios de quiz por minuto por aluno. */
const SUBMIT_LIMIT = 10
const SUBMIT_WINDOW_MS = 60_000

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name)

  constructor(
    private readonly repo: QuizzesRepository,
    private readonly gamification: GamificationService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Questões para responder: SEM correct_index nem explicação. */
  async forStudent(user: AuthUser, lessonId: string): Promise<QuizQuestionPublic[]> {
    await this.quizLesson(user, lessonId)
    const rows = await this.repo.publicQuestions(lessonId)
    return rows.map(toQuizQuestionPublic)
  }

  async forAuthoring(user: AuthUser, lessonId: string): Promise<QuizQuestionFull[]> {
    await this.ownedLesson(user, lessonId)
    return (await this.repo.questions(lessonId)).map(toQuizQuestionFull)
  }

  async replace(user: AuthUser, lessonId: string, questions: QuizQuestionInput[]): Promise<QuizQuestionFull[]> {
    const lesson = await this.ownedLesson(user, lessonId)
    if (lesson.published && lesson.lessonType === "quiz" && !questions.length) {
      throw Unprocessable("Um quiz publicado precisa de ao menos uma questão.", "NO_QUESTIONS")
    }
    return (await this.repo.replace(lessonId, questions)).map(toQuizQuestionFull)
  }

  /**
   * Corrige no servidor e, se aprovado numa lição publicada, conclui a lição
   * pelo GamificationService (idempotente: XP só na primeira aprovação).
   */
  async submit(user: AuthUser, lessonId: string, answers: Record<string, number>): Promise<QuizResult> {
    const lesson = await this.quizLesson(user, lessonId)
    this.rateLimit.consume(`quiz:${user.id}`, SUBMIT_LIMIT, SUBMIT_WINDOW_MS, "Muitos envios seguidos. Aguarde um instante.")

    const questions = await this.repo.questions(lessonId)
    if (!questions.length) throw Unprocessable("Este quiz ainda não tem questões. Avise o professor.", "NO_QUESTIONS")

    const grade = gradeQuiz(questions, answers, lesson.quizPassingScore)
    // Prévia do professor numa lição não publicada não credita XP.
    const counts = grade.passed && lesson.published
    const outcome = counts ? await this.gamification.completeLesson(user.id, lessonId, { score: grade.score }) : null
    this.logger.log({ userId: user.id, lessonId, score: grade.score, passed: grade.passed }, "quiz corrigido")

    return {
      score: grade.score,
      passed: grade.passed,
      passingScore: lesson.quizPassingScore,
      correctCount: grade.correctCount,
      total: grade.total,
      review: grade.review,
      xp_awarded: outcome?.xpAwarded ?? 0,
      lesson_completed: counts,
    }
  }

  /** Lição de quiz visível ao usuário (publicada, ou rascunho do dono/admin). */
  private async quizLesson(user: AuthUser, lessonId: string) {
    const lesson = await this.repo.findLesson(lessonId)
    if (!lesson || !canView(user, lesson.published, lesson.createdBy)) throw NotFound("Lição")
    if (lesson.lessonType !== "quiz") throw Unprocessable("Esta lição não é um questionário.", "NOT_A_QUIZ")
    return lesson
  }

  private async ownedLesson(user: AuthUser, lessonId: string) {
    const lesson = await this.repo.findLesson(lessonId)
    if (!lesson || !canView(user, lesson.published, lesson.createdBy)) throw NotFound("Lição")
    if (!canManage(user, lesson.createdBy)) throw Forbidden("Só o autor da lição (ou um admin) pode ver o gabarito.")
    return lesson
  }
}
