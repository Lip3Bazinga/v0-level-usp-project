import { describe, expect, it, vi } from "vitest"
import type { LessonStepInput, StepSubmitResult } from "@levelusp/contracts"
import { StepBackendError } from "@/components/lesson-steps/step-backend"
import { createStep } from "../steps-form"
import { createPreviewBackend, PreviewRunError, PreviewVerifyUnavailable } from "./preview-backend"

const exercise: LessonStepInput = { ...createStep("exercicio", 1), hints: ["dica 1", "dica 2"] }
const prediction: LessonStepInput = {
  ...createStep("previsao", 2),
  starter_files: [{ path: "main.py", content: "print(1)\nprint(2)\n" }],
  expected_output: "1\n2",
}
const steps = new Map([["previa-1", exercise], ["previa-2", prediction]])

describe("backend da prévia", () => {
  it("revela as dicas do professor, uma a uma, e lembra as já reveladas", async () => {
    const backend = createPreviewBackend(steps, vi.fn())
    expect(backend.isPreview).toBe(true)
    expect(await backend.revealStepHint("l", "previa-1")).toEqual({ index: 0, text: "dica 1" })
    expect(await backend.revealStepHint("l", "previa-1")).toEqual({ index: 1, text: "dica 2" })
    await expect(backend.revealStepHint("l", "previa-1")).rejects.toBeInstanceOf(StepBackendError)
    expect(await backend.fetchRevealedStepHints("l", "previa-1")).toHaveLength(2)
  })

  it("entrega a solução do exercício e a saída esperada da previsão sem limite de tentativas", async () => {
    const backend = createPreviewBackend(steps, vi.fn())
    expect(await backend.revealStepSolution("l", "previa-1")).toEqual({ files: exercise.solution_files, expected_output: null })
    expect(await backend.revealStepSolution("l", "previa-2")).toEqual({ files: [], expected_output: "1\n2" })
  })

  it("previsão: roda o código no navegador e compara ignorando espaços no fim das linhas", async () => {
    const runPython = vi.fn().mockResolvedValue("1\n2\n")
    const backend = createPreviewBackend(steps, runPython)

    const right = await backend.submitStepPrediction("l", "previa-2", "1  \r\n2")
    expect(right).toMatchObject({ passed: true, attempts: 1, step_completed: false, xp_awarded: 0 })
    expect(runPython).toHaveBeenCalledWith(prediction.starter_files, "main.py")

    const wrong = await backend.submitStepPrediction("l", "previa-2", "1\n3")
    expect(wrong).toMatchObject({ passed: false, attempts: 2 })
  })

  it("previsão: erro ao rodar o código vira mensagem para a tela, sem contar tentativa", async () => {
    const runPython = vi.fn().mockRejectedValueOnce(new PreviewRunError("deu erro")).mockResolvedValue("1\n2")
    const backend = createPreviewBackend(steps, runPython)
    await expect(backend.submitStepPrediction("l", "previa-2", "1")).rejects.toThrow("deu erro")
    expect(await backend.submitStepPrediction("l", "previa-2", "1")).toMatchObject({ attempts: 1 })
  })

  it("Verificar não corrige: recusa com a mensagem do servidor, sem rodar nada", async () => {
    const runPython = vi.fn()
    const backend = createPreviewBackend(steps, runPython)
    await expect(backend.submitStep("l", "previa-1", exercise.starter_files)).rejects.toBeInstanceOf(PreviewVerifyUnavailable)
    await expect(backend.submitStepArrangement("l", "previa-1", [])).rejects.toThrow("A correção roda no servidor")
    expect(runPython).not.toHaveBeenCalled()
  })

  it("ponto de extensão `verify` (Fase F) assume o Verificar quando informado", async () => {
    const result = { passed: true } as StepSubmitResult
    const verify = vi.fn().mockResolvedValue(result)
    const backend = createPreviewBackend(steps, vi.fn(), { verify })
    expect(await backend.submitStep("l", "previa-1", exercise.starter_files)).toBe(result)
    expect(verify).toHaveBeenCalledWith(exercise, { kind: "files", files: exercise.starter_files })
  })

  it("enxerga edições novas quando recebe uma função e recusa passo que sumiu", async () => {
    let current = new Map(steps)
    const backend = createPreviewBackend(() => current, vi.fn())
    current = new Map([["previa-1", { ...exercise, hints: ["nova"] }]])
    expect(await backend.revealStepHint("l", "previa-1")).toEqual({ index: 0, text: "nova" })
    await expect(backend.revealStepSolution("l", "previa-2")).rejects.toBeInstanceOf(StepBackendError)
  })
})
