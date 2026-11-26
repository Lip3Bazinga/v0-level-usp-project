import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LessonStepInput, StepSubmitResult } from "@levelusp/contracts"
import * as api from "@/lib/api"
import type * as LibApi from "@/lib/api"
import { createStep } from "../steps-form"
import { createPreviewVerify, type PreviewEngine } from "./preview-verify"

vi.mock("@/lib/api", async (importOriginal) => ({ ...(await importOriginal<typeof LibApi>()), submitDraftStep: vi.fn() }))

const exercise: LessonStepInput = createStep("exercicio", 2)
const graded: StepSubmitResult = {
  step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0,
  step_id: "rascunho-2", passed: true, cases: [], attempts: 0, solution_available: true,
}

describe("Verificar da prévia (API do rascunho)", () => {
  beforeEach(() => {
    vi.mocked(api.submitDraftStep).mockReset().mockResolvedValue(graded)
  })

  it("envia o passo do rascunho com o motor mais novo e os arquivos, e devolve o id do passo da prévia", async () => {
    let engine: PreviewEngine = { runtime: "python", libraries: [] }
    const verify = createPreviewVerify(() => engine)
    engine = { runtime: "python-dados", libraries: ["numpy"] }
    const files = [{ path: "main.py", content: "print(1)\n", extra: "ignorado" }]

    expect(await verify(exercise, { kind: "files", files })).toEqual({ ...graded, step_id: "previa-2" })
    expect(api.submitDraftStep).toHaveBeenCalledWith({
      runtime: "python-dados",
      libraries: ["numpy"],
      step: { ...exercise, wrong_solutions: [] },
      files: [{ path: "main.py", content: "print(1)\n" }],
    })
  })

  it("no exercício de ordenar envia o arranjo, sem arquivos", async () => {
    const verify = createPreviewVerify(() => ({ runtime: "python", libraries: [] }))
    await verify(exercise, { kind: "arrangement", arrangement: [{ line_id: "l2", indent: 0 }, { line_id: "l1", indent: 1 }] })
    const [input] = vi.mocked(api.submitDraftStep).mock.calls[0] ?? []
    expect(input?.arrangement).toEqual([{ line_id: "l2", indent: 0 }, { line_id: "l1", indent: 1 }])
    expect(input).not.toHaveProperty("files")
  })

  it("repassa o erro da API (a tela mostra a mensagem dela)", async () => {
    const failure = new api.ApiError(503, "RUNNER_UNAVAILABLE", "O corretor está fora do ar.")
    vi.mocked(api.submitDraftStep).mockRejectedValue(failure)
    await expect(createPreviewVerify(() => ({ runtime: "python", libraries: [] }))(exercise, { kind: "files", files: [] })).rejects.toBe(failure)
  })
})
