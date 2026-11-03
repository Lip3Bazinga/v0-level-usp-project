import { Injectable, Logger } from "@nestjs/common"
import type { AnswerSheet, QuizQuestionFull, QuizQuestionInput, QuizQuestionPublic, QuizResult } from "@levelusp/contracts"
import { canManage, canViewContent } from "@/common/authorization/ownership"
import { Forbidden, NotFound, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { GamificationService } from "../gamification/gamification.service"
import { gradeQuiz } from "./quizzes.domain"
import { toQuizQuestionFull, toQuizQuestionPublic } from "./quizzes.mapper"
import { QuizzesRepository, type QuizLessonRow } from "./quizzes.repository"

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name)

  constructor(
    private readonly repo: QuizzesRepository,
    private readonly gamification: GamificationService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** Questões para responder: SEM correct_index nem explicação. */
  async listForStudent(user: AuthUser, lessonId: string): Promise<QuizQuestionPublic[]> {
    await this.findVisibleQuiz(user, lessonId)
    return (await this.repo.listPublicQuestions(lessonId)).map(toQuizQuestionPublic)
  }

  async listForAuthoring(user: AuthUser, lessonId: string): Promise<QuizQuestionFull[]> {
    await this.findManageableLesson(user, lessonId)
    return (await this.repo.listQuestions(lessonId)).map(toQuizQuestionFull)
  }

  async replace(user: AuthUser, lessonId: string, questions: QuizQuestionInput[]): Promise<QuizQuestionFull[]> {
    const lesson = await this.findManageableLesson(user, lessonId)
    if (lesson.published && lesson.lessonType === "quiz" && !questions.length) {
      throw Unprocessable("Um quiz publicado precisa de ao menos uma questão.", "NO_QUESTIONS")
    }
    return (await this.repo.replaceQuestions(lessonId, questions)).map(toQuizQuestionFull)
  }

  /**
   * Corrige no servidor e, se aprovado numa lição publicada, conclui a lição
   * pelo GamificationService (idempotente: XP só na primeira aprovação).
   */
  async submit(user: AuthUser, lessonId: string, answers: AnswerSheet): Promise<QuizResult> {
    const lesson = await this.findVisibleQuiz(user, lessonId)
    this.rateLimit.consume(RATE_LIMITS.quizSubmission, user.id)

    const questions = await this.repo.listQuestions(lessonId)
    if (!questions.length) throw Unprocessable("Este quiz ainda não tem questões. Avise o professor.", "NO_QUESTIONS")

    const quizGrade = gradeQuiz(questions, answers, lesson.quizPassingScore)
    // Prévia do professor numa lição não publicada não credita XP.
    const shouldCredit = quizGrade.passed && lesson.published
    const outcome = shouldCredit ? await this.gamification.completeLesson(user.id, lessonId, { score: quizGrade.score }) : null
    this.logger.log({ userId: user.id, lessonId, score: quizGrade.score, passed: quizGrade.passed }, "quiz corrigido")

    return {
      score: quizGrade.score,
      passed: quizGrade.passed,
      passingScore: lesson.quizPassingScore,
      correctCount: quizGrade.correctCount,
      total: quizGrade.total,
      // Correção por questão só após aprovar (evita descobrir o gabarito por tentativa e erro).
      review: quizGrade.passed ? quizGrade.review : [],
      xp_awarded: outcome?.xpAwarded ?? 0,
      lesson_completed: shouldCredit,
    }
  }

  /** Lição de quiz visível ao usuário (publicada, ou rascunho do dono/admin). */
  private async findVisibleQuiz(user: AuthUser, lessonId: string): Promise<QuizLessonRow> {
    const lesson = await this.repo.findLesson(lessonId)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    if (lesson.lessonType !== "quiz") throw Unprocessable("Esta lição não é um questionário.", "NOT_A_QUIZ")
    return lesson
  }

  private async findManageableLesson(user: AuthUser, lessonId: string): Promise<QuizLessonRow> {
    const lesson = await this.repo.findLesson(lessonId)
    if (!lesson || !canViewContent(user, lesson)) throw NotFound("Lição")
    if (!canManage(user, lesson.createdBy)) throw Forbidden("Só o autor da lição (ou um admin) pode ver o gabarito.")
    return lesson
  }
}
