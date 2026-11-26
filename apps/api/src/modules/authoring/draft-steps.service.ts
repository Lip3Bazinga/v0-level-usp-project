import { Injectable } from "@nestjs/common"
import type {
  DraftStepSubmitInput, DraftStepVerifyInput, DraftStepVerifyResult, GradeResult, LessonRuntime, ProjectFile, StepSubmitResult, TestCase,
} from "@levelusp/contracts"
import { AppError, BadRequest, Conflict } from "@/common/errors/app-error"
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

/** Corrige um projeto no executor, dentro da cota já reservada do pedido. */
type GradeProject = (files: ProjectFile[]) => Promise<GradeResult>

/** Execuções no executor que um plano de verificação faz: a solução, o código inicial (se há) e cada solução errada. */
export function countPlanExecutions(plan: StepVerificationPlan): number {
  return 1 + (plan.starter ? 1 : 0) + plan.wrong.length
}

/**
 * Correção de passos do rascunho do editor (ainda não salvo): o "Testar gabarito" e o "Verificar"
 * da prévia. Nada é lido do banco nem gravado: não há submissão, tentativa, progresso nem XP — só
 * o veredito do motor de correção sobre o que veio no pedido. O limite conta EXECUÇÕES no executor
 * (não pedidos) e cada usuário tem um pedido em andamento por vez (trava em memória, por instância).
 */
@Injectable()
export class DraftStepsService {
  private readonly usersGrading = new Set<string>()

  constructor(
    private readonly grading: GradingService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /**
   * "Testar gabarito" de um passo de exercício, com a regra de `content:verify`: a solução de
   * referência precisa aprovar, o código inicial reprovar e cada solução errada reprovar. Os
   * projetos rodam um por vez (o executor é compartilhado com os alunos) e cada um consome uma
   * execução do limite.
   *
   * @throws AppError 409 `DRAFT_GRADING_IN_PROGRESS` com outro pedido do usuário em andamento; 429 sem
   *         cota para todas as execuções do passo; 503 quando o executor está fora do ar ou ocupado.
   */
  async verify(user: AuthUser, input: DraftStepVerifyInput): Promise<DraftStepVerifyResult> {
    const { step } = input
    const starter = resolveStepStarter(step, input.inherited_starter)
    const plan = planStepVerification(step, starter)
    if (plan === null) return toUnverifiableStepResult(step.order, UNASSEMBLED_PARSONS_DETAIL)
    const context: DraftGradingContext = { runtime: input.runtime, libraries: input.libraries, testCases: step.test_cases }
    const grades = await this.withExecutions(user.id, countPlanExecutions(plan), context, (grade) => gradePlan(plan, grade))
    return toDraftStepVerifyResult(step.order, starter, grades, concludeStepVerification(step, starter, grades, { requireWrongSolutions: false }))
  }

  /**
   * "Verificar" da prévia: corrige a submissão (arquivos, ou o arranjo no exercício `ordenar`)
   * contra os casos do passo do rascunho (uma execução do limite). A resposta tem o formato da do
   * aluno, com o efeito na gamificação zerado.
   *
   * @throws AppError 400 projeto sem `main.py`, `WRONG_SUBMISSION_FORMAT` ou `INVALID_ARRANGEMENT`;
   *         409 `DRAFT_GRADING_IN_PROGRESS`; 429 no limite; 503 quando o executor está fora do ar ou ocupado.
   */
  async submit(user: AuthUser, input: DraftStepSubmitInput): Promise<StepSubmitResult> {
    const { step } = input
    const files = resolveSubmittedFiles({ exerciseMode: step.exercise_mode, parsonsLines: step.parsons_lines }, input)
    if (!hasEntryFile(files)) throw BadRequest("O projeto precisa de um arquivo main.py.")
    const context: DraftGradingContext = { runtime: input.runtime, libraries: input.libraries, testCases: step.test_cases }
    const result = await this.withExecutions(user.id, 1, context, (grade) => grade(files))
    return toDraftStepSubmitResult(step.order, result, step.test_cases)
  }

  /**
   * Roda `task` com `executions` execuções reservadas no limite do usuário e a trava de pedido
   * único. Fila cheia no executor (`RUNNER_BUSY`: aquele projeto nem rodou) devolve só as execuções
   * que não aconteceram; as já feitas continuam contando.
   */
  private async withExecutions<Result>(userId: string, executions: number, context: DraftGradingContext, task: (grade: GradeProject) => Promise<Result>): Promise<Result> {
    if (this.usersGrading.has(userId)) {
      throw Conflict("Já há um teste seu em andamento. Espere ele terminar para enviar outro.", "DRAFT_GRADING_IN_PROGRESS")
    }
    this.usersGrading.add(userId)
    try {
      this.reserve(userId, executions)
      let completed = 0
      const grade: GradeProject = async (files) => {
        const result = await this.grading.grade(files, context.testCases, { runtime: context.runtime, libraries: context.libraries })
        completed++
        return result
      }
      try {
        return await task(grade)
      } catch (error) {
        if (error instanceof AppError && error.code === RUNNER_BUSY_CODE) this.refund(userId, executions - completed)
        throw error
      }
    } finally {
      this.usersGrading.delete(userId)
    }
  }

  /** Reserva todas as execuções do pedido ou nenhuma: sem cota para o passo inteiro, nada roda. */
  private reserve(userId: string, executions: number): void {
    for (let reserved = 0; reserved < executions; reserved++) {
      try {
        this.rateLimit.consume(RATE_LIMITS.draftStepGrading, userId)
      } catch (error) {
        this.refund(userId, reserved)
        throw error
      }
    }
  }

  private refund(userId: string, executions: number): void {
    for (let refunded = 0; refunded < executions; refunded++) this.rateLimit.refund(RATE_LIMITS.draftStepGrading, userId)
  }
}

async function gradePlan(plan: StepVerificationPlan, grade: GradeProject): Promise<StepVerificationGrades> {
  const solution = await grade(plan.solution)
  const starter = plan.starter ? await grade(plan.starter.files) : null
  const wrong: WrongSolutionResult[] = []
  for (const entry of plan.wrong) wrong.push({ name: entry.name, result: await grade(entry.files) })
  return { solution, starter, wrong }
}
