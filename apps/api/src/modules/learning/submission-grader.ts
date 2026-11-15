import { Injectable, Logger } from "@nestjs/common"
import type { GradeResult, ProjectFile, TestCase } from "@levelusp/contracts"
import { AppError } from "@/common/errors/app-error"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { RUNNER_BUSY_CODE } from "@/infra/runner/code-runner"
import { GradingService, type GradingEngineOptions } from "../grading/grading.service"
import { LearningRepository } from "./learning.repository"

/** HTTP 503: a correção não aconteceu por falha de infraestrutura (executor fora do ar, ocupado, prazo do host). */
const SERVICE_UNAVAILABLE_STATUS = 503

/** O que uma verificação precisa: quem enviou, onde e contra qual gabarito. */
export interface GradingRequest {
  userId: string
  lessonId: string
  /** Passo verificado; null nas lições sem passos. */
  stepId: string | null
  files: ProjectFile[]
  testCases: TestCase[]
  engine: GradingEngineOptions
}

/** Veredito gravado: o resultado por caso e o id da submissão. */
export interface RecordedGrade {
  submissionId: string
  result: GradeResult
}

/**
 * "Verificar": aplica os limites, corrige no executor e grava a submissão — a mesma
 * sequência para a lição clássica e para o passo da lição guiada.
 */
@Injectable()
export class SubmissionGrader {
  private readonly logger = new Logger(SubmissionGrader.name)

  constructor(
    private readonly repo: LearningRepository,
    private readonly grading: GradingService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /**
   * Corrige e grava a submissão com `status: "graded"`.
   *
   * Falha de infraestrutura (503 do executor) grava a submissão com `status: "error"` e
   * repassa o erro: não é veredito, não conta como tentativa nem como reprovação. Na fila
   * cheia (`RUNNER_BUSY`: o código nem rodou) as cotas de verificação são devolvidas.
   *
   * @throws AppError 429 nos limites de verificação; 422 `INVALID_TESTS`; 503 quando o executor falha.
   */
  async grade(request: GradingRequest): Promise<RecordedGrade> {
    const { userId, lessonId, stepId, files } = request
    this.rateLimit.consume(RATE_LIMITS.codeSubmission, userId)
    this.rateLimit.consume(RATE_LIMITS.codeSubmissionPerLessonDay, `${userId}:${lessonId}`)
    try {
      const { engine, ...result } = await this.grading.grade(files, request.testCases, request.engine)
      const submissionId = await this.repo.createSubmission({
        userId, lessonId, stepId, files, status: "graded", passed: result.allPassed, result, engine, durationMs: result.durationMs,
      })
      this.logger.log({ userId, lessonId, stepId, passed: result.allPassed, ms: result.durationMs }, "submissão corrigida")
      return { submissionId, result }
    } catch (error) {
      if (!(error instanceof AppError) || error.statusCode !== SERVICE_UNAVAILABLE_STATUS) throw error
      if (error.code === RUNNER_BUSY_CODE) {
        this.rateLimit.refund(RATE_LIMITS.codeSubmission, userId)
        this.rateLimit.refund(RATE_LIMITS.codeSubmissionPerLessonDay, `${userId}:${lessonId}`)
      }
      await this.recordInfrastructureError(request, error.code)
      throw error
    }
  }

  /** A trilha de auditoria guarda a falha; se nem isso gravar, o aluno ainda recebe o 503 original. */
  private async recordInfrastructureError({ userId, lessonId, stepId, files }: GradingRequest, code: string): Promise<void> {
    try {
      await this.repo.createSubmission({ userId, lessonId, stepId, files, status: "error", passed: false, result: null, engine: code })
    } catch (error) {
      this.logger.error({ err: error, userId, lessonId, stepId }, "falha ao gravar submissão com erro de infraestrutura")
    }
  }
}
