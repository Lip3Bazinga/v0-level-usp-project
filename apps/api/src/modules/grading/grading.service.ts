import { Inject, Injectable } from "@nestjs/common"
import { DEFAULT_ENTRY_FILE, DEFAULT_RUNNER_LIMITS, testCasesSchema, type GradeResult, type ProjectFile, type TestCase } from "@levelusp/contracts"
import { Unprocessable } from "@/common/errors/app-error"
import { MS_PER_SECOND } from "@/common/time/time"
import { CODE_RUNNER, type CodeRunner } from "@/infra/runner/code-runner"
import { buildProbes, grade } from "./grading.domain"

/** Tempo máximo de execução de uma correção (laço infinito → reprova em 10 s). */
export const GRADING_TIMEOUT_SECONDS = 10
const MIN_TIMEOUT_SECONDS = 2
const MAX_TIMEOUT_SECONDS = 25

export interface GradedSubmission extends GradeResult {
  /** Versão do Python e do runtime que corrigiram (gravada na submissão). */
  engine: string
}

/** Orquestra correção: monta sondas → executor → comparação local. */
@Injectable()
export class GradingService {
  constructor(@Inject(CODE_RUNNER) private readonly runner: CodeRunner) {}

  /**
   * @param timeoutSeconds orçamento de execução da correção (2–25 s). Não confundir
   *        com `lessons.time_limit`, que é o tempo ESTIMADO de estudo, em minutos.
   */
  async grade(files: ProjectFile[], rawCases: TestCase[], timeoutSeconds = GRADING_TIMEOUT_SECONDS): Promise<GradedSubmission> {
    // Normaliza (defaults do schema) e recusa gabaritos corrompidos no banco.
    const parsed = testCasesSchema.safeParse(rawCases)
    if (!parsed.success) throw Unprocessable("O gabarito desta lição está inválido. Avise o professor.", "INVALID_TESTS")
    const cases = parsed.data
    const timeoutMs = Math.min(Math.max(timeoutSeconds, MIN_TIMEOUT_SECONDS), MAX_TIMEOUT_SECONDS) * MS_PER_SECOND
    const result = await this.runner.run({
      files,
      entry: DEFAULT_ENTRY_FILE,
      probes: buildProbes(cases),
      limits: { timeoutMs, memoryMb: DEFAULT_RUNNER_LIMITS.memoryMb },
    })
    return { ...grade(cases, result.observations, result.durationMs), engine: `${result.engine.python} / ${result.engine.runtime}` }
  }
}
