import { Injectable } from "@nestjs/common"
import { testCasesSchema, type GradeResult, type ProjectFile, type TestCase } from "@levelusp/contracts"
import { Unprocessable } from "@/common/errors/app-error"
import { RunnerClient } from "@/infra/runner/runner.client"
import { buildProbes, grade } from "./grading.domain"

/** Tempo máximo de execução de uma correção (laço infinito → reprova em 10 s). */
export const GRADING_TIMEOUT_SECONDS = 10

/** Orquestra correção: monta sondas → executor → comparação local. */
@Injectable()
export class GradingService {
  constructor(private readonly runner: RunnerClient) {}

  /**
   * @param timeoutSeconds orçamento de execução da correção (2–25 s). Não confundir
   *        com `lessons.time_limit`, que é o tempo ESTIMADO de estudo, em minutos.
   */
  async grade(files: ProjectFile[], rawCases: TestCase[], timeoutSeconds = GRADING_TIMEOUT_SECONDS): Promise<GradeResult & { engine: string }> {
    // Normaliza (defaults do schema) e recusa gabaritos corrompidos no banco.
    const parsed = testCasesSchema.safeParse(rawCases)
    if (!parsed.success) throw Unprocessable("O gabarito desta lição está inválido. Avise o professor.", "INVALID_TESTS")
    const cases = parsed.data
    const probes = buildProbes(cases)
    const timeoutMs = Math.min(Math.max(timeoutSeconds, 2), 25) * 1000
    const result = await this.runner.run({ files, entry: "main.py", probes, limits: { timeoutMs, memoryMb: 128 } })
    return { ...grade(cases, result.observations, result.durationMs), engine: `${result.engine.python} / ${result.engine.runtime}` }
  }
}
