import { Injectable } from "@nestjs/common"
import type {
  DraftStepSubmitInput, DraftStepVerifyInput, DraftStepVerifyResult, GradeResult, LessonRuntime, ProjectFile, StepSubmitResult, TestCase,
} from "@levelusp/contracts"
import { AppError, BadRequest } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { RUNNER_BUSY_CODE } from "@/infra/runner/code-runner"
import { GradingService } from "../grading/grading.service"
import { hasEntryFile } from "../learning/learning.domain"
import { resolveSubmittedFiles } from "../learning/step-submission"
import { toDraftStepSubmitResult, toDraftStepVerifyResult, toUnverifiableStepResult } from "./draft-steps.mapper"
import {
  concludeStepVerification, planStepVerification, resolveStepStarter, UNASSEMBLED_PARSONS_DETAIL,
  type StepVerificationGrades, type StepVerificationPlan, type WrongSolutionResult,
} from "./step-verification.domain"

/** Motor da lição em edição e os casos do passo: o que toda correção de rascunho usa. */
interface DraftGradingContext {
  runtime: LessonRuntime
  libraries: string[]
  testCases: TestCase[]
}

/**
 * Correção de passos do rascunho do editor (ainda não salvo): o "Testar gabarito" e o "Verificar"
 * da prévia. Nada é lido do banco nem gravado: não há submissão, tentativa, progresso nem XP — só
 * o veredito do motor de correção sobre o que veio no pedido.
 */
@Injectable()
export class DraftStepsService {
  constructor(
    private readonly grading: GradingService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /**
   * "Testar gabarito" de um passo de exercício, com a regra de `content:verify`: a solução de
   * referência precisa aprovar, o código inicial reprovar e cada solução errada reprovar. Os
   * projetos rodam um por vez (o executor é compartilhado com os alunos).
   *
   * @throws AppError 429 no limite de testes; 503 quando o executor está fora do ar ou ocupado.
   */
  async verify(user: AuthUser, input: DraftStepVerifyInput): Promise<DraftStepVerifyResult> {
    this.rateLimit.consume(RATE_LIMITS.draftStepGrading, user.id)
    const { step } = input
    const starter = resolveStepStarter(step, input.inherited_starter)
    const plan = planStepVerification(step, starter)
    if (plan === null) return toUnverifiableStepResult(step.order, UNASSEMBLED_PARSONS_DETAIL)
    const context: DraftGradingContext = { runtime: input.runtime, libraries: input.libraries, testCases: step.test_cases }
    const grades = await this.refundingWhenBusy(user.id, () => this.gradePlan(plan, context))
    return toDraftStepVerifyResult(step.order, starter, grades, concludeStepVerification(step, starter, grades, { requireWrongSolutions: false }))
  }

  /**
   * "Verificar" da prévia: corrige a submissão (arquivos, ou o arranjo no exercício `ordenar`)
   * contra os casos do passo do rascunho. A resposta tem o formato da do aluno, com o efeito na
   * gamificação zerado.
   *
   * @throws AppError 400 projeto sem `main.py`, `WRONG_SUBMISSION_FORMAT` ou `INVALID_ARRANGEMENT`;
   *         429 no limite de testes; 503 quando o executor está fora do ar ou ocupado.
   */
  async submit(user: AuthUser, input: DraftStepSubmitInput): Promise<StepSubmitResult> {
    this.rateLimit.consume(RATE_LIMITS.draftStepGrading, user.id)
    const { step } = input
    const files = resolveSubmittedFiles({ exerciseMode: step.exercise_mode, parsonsLines: step.parsons_lines }, input)
    if (!hasEntryFile(files)) throw BadRequest("O projeto precisa de um arquivo main.py.")
    const context: DraftGradingContext = { runtime: input.runtime, libraries: input.libraries, testCases: step.test_cases }
    const result = await this.refundingWhenBusy(user.id, () => this.grade(files, context))
    return toDraftStepSubmitResult(step.order, result, step.test_cases)
  }

  private async gradePlan(plan: StepVerificationPlan, context: DraftGradingContext): Promise<StepVerificationGrades> {
    const solution = await this.grade(plan.solution, context)
    const starter = plan.starter ? await this.grade(plan.starter.files, context) : null
    const wrong: WrongSolutionResult[] = []
    for (const entry of plan.wrong) wrong.push({ name: entry.name, result: await this.grade(entry.files, context) })
    return { solution, starter, wrong }
  }

  private grade(files: ProjectFile[], context: DraftGradingContext): Promise<GradeResult> {
    return this.grading.grade(files, context.testCases, { runtime: context.runtime, libraries: context.libraries })
  }

  /** Fila cheia no executor (`RUNNER_BUSY`: o código nem rodou) devolve a cota do pedido. */
  private async refundingWhenBusy<Result>(userId: string, task: () => Promise<Result>): Promise<Result> {
    try {
      return await task()
    } catch (error) {
      if (error instanceof AppError && error.code === RUNNER_BUSY_CODE) this.rateLimit.refund(RATE_LIMITS.draftStepGrading, userId)
      throw error
    }
  }
}
