import { Injectable } from "@nestjs/common"
import type { GrantedBadge, StreakResult } from "@levelusp/contracts"
import { saoPauloDate } from "@/common/time/time"
import { TransactionRunner } from "@/infra/database/database.module"
import { NotificationsService } from "../notifications/notifications.service"
import { toGrantedBadge } from "./badge.mapper"
import { eligibleBadges, levelForXp, nextStreak, stepXp, type PlayerStats } from "./gamification.domain"
import { GamificationRepository } from "./gamification.repository"
import type { DbTransaction, DbExecutor } from "@levelusp/db"

/** Efeito de uma conclusão (zerado quando a lição já estava concluída). */
export interface CompletionOutcome {
  /** false quando a lição já estava concluída (XP não é creditado de novo). */
  newlyCompleted: boolean
  xpAwarded: number
  levelUp: boolean
  newLevel: number
  newBadges: GrantedBadge[]
  courseCompleted: boolean
}

/** Dados extras da conclusão; `score` é a nota do questionário. */
export interface CompletionOptions {
  score?: number | null
}

/** Efeito de concluir um passo (zerado quando o passo já estava concluído). */
export interface StepCompletionOutcome {
  /** false quando o passo já estava concluído (XP não é creditado de novo). */
  newlyCompleted: boolean
  /** XP do passo mais o da lição, quando este passo a fechou. */
  xpAwarded: number
  /** true quando este passo era o último pendente e a lição foi concluída agora. */
  lessonCompleted: boolean
  levelUp: boolean
  newLevel: number
  newBadges: GrantedBadge[]
}

const NO_STREAK: StreakResult = { streak: 0, increased: false, reset: false }

/**
 * Única porta de entrada para XP, nível, sequência e badges. Nenhum outro
 * módulo (nem o cliente) escreve esses campos — fim do "award_xp" chamável
 * pelo navegador.
 */
@Injectable()
export class GamificationService {
  constructor(
    private readonly repo: GamificationRepository,
    private readonly transactions: TransactionRunner,
    private readonly notifications: NotificationsService,
  ) {}

  /** Registra atividade do dia (uma conclusão: passo, lição ou quiz) e atualiza a sequência. */
  async touchStreak(userId: string, executor?: DbExecutor): Promise<StreakResult> {
    const current = await this.repo.lockStreak(userId, executor)
    if (!current) return { ...NO_STREAK }
    const today = saoPauloDate()
    const result = nextStreak(current.lastActivityDate, today, current.currentStreak)
    if (current.lastActivityDate !== today) await this.repo.updateStreak({ userId, streak: result.streak, today }, executor)
    return result
  }

  /**
   * Conclui uma lição de forma idempotente e credita o XP real da lição.
   * Deve ser chamada SOMENTE depois de um veredito do servidor.
   */
  completeLesson(userId: string, lessonId: string, options: CompletionOptions = {}): Promise<CompletionOutcome> {
    return this.transactions.run((tx: DbTransaction) => this.completeLessonIn(tx, userId, lessonId, options))
  }

  /**
   * Conclui um passo de lição guiada de forma idempotente: credita o XP do passo (metade
   * se o aluno viu a solução), conta o dia na sequência e, quando era o último passo
   * pendente, conclui a lição na mesma transação (XP da lição, curso, badges).
   * Deve ser chamada SOMENTE depois de um veredito do servidor.
   *
   * @param credit false na prévia do professor numa lição não publicada: o passo fica
   *        concluído (para ele seguir adiante), sem XP, sequência nem conclusão de lição.
   */
  completeStep(userId: string, stepId: string, credit = true): Promise<StepCompletionOutcome> {
    return this.transactions.run(async (tx: DbTransaction) => {
      const step = await this.repo.findStepReward(stepId, tx)
      if (!step) throw new Error(`passo ${stepId} inexistente`)
      const before = await this.repo.lockProgression(userId, tx)
      if (!before) throw new Error(`perfil ${userId} inexistente`)
      const progress = await this.repo.findStepProgress(userId, stepId, tx)
      if (progress?.status === "completed") {
        return { newlyCompleted: false, xpAwarded: 0, lessonCompleted: false, levelUp: false, newLevel: before.level, newBadges: [] }
      }

      if (!credit) {
        await this.repo.markStepCompleted({ userId, stepId, xpAwarded: 0 }, tx)
        return { newlyCompleted: true, xpAwarded: 0, lessonCompleted: false, levelUp: false, newLevel: before.level, newBadges: [] }
      }

      const xpAwarded = stepXp(step.xp, progress?.solutionViewed ?? false)
      await this.repo.markStepCompleted({ userId, stepId, xpAwarded }, tx)
      const totalXp = before.totalXp + xpAwarded
      const levelAfterStep = levelForXp(totalXp)
      await this.repo.creditXp({ userId, totalXp, level: levelAfterStep }, tx)
      await this.touchStreak(userId, tx)

      if ((await this.repo.countPendingSteps(userId, step.lessonId, tx)) > 0) {
        const newBadges = await this.grantBadges(userId, tx)
        return { newlyCompleted: true, xpAwarded, lessonCompleted: false, levelUp: levelAfterStep > before.level, newLevel: levelAfterStep, newBadges }
      }
      const lesson = await this.completeLessonIn(tx, userId, step.lessonId, {})
      // Lição que já estava concluída (passo acrescentado depois): os badges do XP do passo ainda são avaliados.
      const newBadges = lesson.newlyCompleted ? lesson.newBadges : await this.grantBadges(userId, tx)
      return {
        newlyCompleted: true,
        xpAwarded: xpAwarded + lesson.xpAwarded,
        lessonCompleted: lesson.newlyCompleted,
        levelUp: lesson.newLevel > before.level,
        newLevel: Math.max(lesson.newLevel, levelAfterStep),
        newBadges,
      }
    })
  }

  /**
   * Avalia os badges automáticos fora de uma conclusão (ex.: logo depois de emitir um
   * certificado, para o critério `certificates_issued`). Devolve só os novos.
   */
  grantEligibleBadges(userId: string): Promise<GrantedBadge[]> {
    return this.transactions.run((tx: DbTransaction) => this.grantBadges(userId, tx))
  }

  /**
   * Garante o registro de conclusão do curso (pré-condição do certificado) para quem terminou
   * as lições antes de `course_completions` existir. Devolve se o curso está concluído.
   */
  ensureCourseCompletion(userId: string, courseId: string): Promise<boolean> {
    return this.transactions.run(async (tx: DbTransaction) => {
      if (await this.repo.hasCourseCompletion(userId, courseId, tx)) return true
      if (!(await this.repo.lockProgression(userId, tx))) return false
      return this.markCourseIfCompleted(userId, courseId, tx)
    })
  }

  private async completeLessonIn(tx: DbTransaction, userId: string, lessonId: string, options: CompletionOptions): Promise<CompletionOutcome> {
    const lesson = await this.repo.findLessonReward(lessonId, tx)
    if (!lesson) throw new Error(`lição ${lessonId} inexistente`)

    // Trava o perfil ANTES de ler o progresso: todas as conclusões do mesmo
    // aluno ficam serializadas, mesmo quando a linha de progresso ainda não
    // existe (FOR UPDATE numa linha inexistente não trava nada).
    const before = await this.repo.lockProgression(userId, tx)
    if (!before) throw new Error(`perfil ${userId} inexistente`)
    if ((await this.repo.findProgressStatus(userId, lessonId, tx)) === "completed") {
      return { newlyCompleted: false, xpAwarded: 0, levelUp: false, newLevel: before.level, newBadges: [], courseCompleted: false }
    }

    await this.repo.markCompleted({ userId, lessonId, xpEarned: lesson.xpReward, score: options.score ?? null }, tx)
    const totalXp = before.totalXp + lesson.xpReward
    const newLevel = levelForXp(totalXp)
    await this.repo.creditLesson({ userId, totalXp, level: newLevel }, tx)
    await this.touchStreak(userId, tx)

    const courseCompleted = lesson.courseId ? await this.markCourseIfCompleted(userId, lesson.courseId, tx) : false
    const newBadges = await this.grantBadges(userId, tx)
    return { newlyCompleted: true, xpAwarded: lesson.xpReward, levelUp: newLevel > before.level, newLevel, newBadges, courseCompleted }
  }

  /** Concede badges automáticos elegíveis; devolve só os novos. */
  private async grantBadges(userId: string, executor: DbExecutor): Promise<GrantedBadge[]> {
    const profile = await this.repo.findProfile(userId, executor)
    if (!profile) return []
    const rules = await this.repo.listBadgeRules(executor)
    const stats: PlayerStats = {
      total_xp: profile.totalXp,
      current_streak: profile.currentStreak,
      max_streak: profile.maxStreak,
      lessons_completed: profile.lessonsCompleted,
      courses_completed: profile.coursesCompleted,
      certificates_issued: await this.repo.countCertificates(userId, executor),
    }
    const earnedIds = eligibleBadges(stats, rules, await this.repo.listOwnedBadgeIds(userId, executor))
    if (!earnedIds.length) return []
    await this.repo.grantBadges(userId, earnedIds, executor)
    const earned = rules.filter((rule) => earnedIds.includes(rule.id))
    await this.notifications.notifyMany(
      userId,
      earned.map((badge) => ({ title: `Nova conquista: ${badge.name}`, body: badge.description, kind: "success", href: "/perfil" })),
      executor,
    )
    return earned.map(toGrantedBadge)
  }

  /**
   * Registra a conclusão do curso (`course_completions`, pré-condição do certificado) quando
   * todas as lições publicadas estão feitas. Idempotente: só conta e notifica na primeira vez.
   */
  private async markCourseIfCompleted(userId: string, courseId: string, executor: DbExecutor): Promise<boolean> {
    const publishedIds = (await this.repo.listPublishedLessonIds(courseId, executor)).map((lesson) => lesson.id)
    if (!publishedIds.length) return false
    if ((await this.repo.countCompleted(userId, publishedIds, executor)) < publishedIds.length) return false
    if (!(await this.repo.createCourseCompletion(userId, courseId, executor))) return false
    await this.repo.incrementCoursesCompleted(userId, executor)
    const courseTitle = await this.repo.findCourseTitle(courseId, executor)
    await this.notifications.notify(
      userId,
      {
        title: "Curso concluído!",
        body: `Você concluiu todas as lições de ${courseTitle ?? "um curso"}. A prova final está liberada.`,
        kind: "success",
        href: `/cursos/${courseId}`,
      },
      executor,
    )
    return true
  }
}
