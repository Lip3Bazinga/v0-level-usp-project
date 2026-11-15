import { describe, expect, it } from "vitest"
import type { LessonStep, LessonStepProgress, StepCaseResult } from "@levelusp/contracts"
import {
  canRevealSolution, checkpointStatuses, firstPendingStepIndex, initialStepFiles, mergeStepProgress, readStepDraft, stepStates, writeStepDraft,
} from "./step-player"

function step(id: string, order: number, kind: LessonStep["kind"] = "exercicio", starter = ""): LessonStep {
  return {
    id, lesson_id: "l", order, kind, title: id, narrative_markdown: "", starter_files: starter ? [{ path: "main.py", content: starter }] : [],
    checkpoints: [], test_case_count: 1, hint_count: 0, quiz_questions: [], xp: 10, exercise_mode: "codigo", parsons_lines: [],
  }
}
function done(stepId: string): LessonStepProgress {
  return { step_id: stepId, status: "completed", attempts: 0, hints_revealed: 0, solution_viewed: false, xp_awarded: 10, completed_at: "2026-11-13T00:00:00Z" }
}
const STEPS = [step("a", 1, "leitura"), step("b", 2), step("c", 3, "quiz")]
const result = (id: string, passed: boolean, checkpoint: number | null): StepCaseResult => ({ id, name: id, passed, message: null, hint: null, checkpoint })

describe("ordem dos passos", () => {
  it("começa no primeiro passo pendente e fica no último quando tudo foi concluído", () => {
    expect(firstPendingStepIndex(STEPS, new Map())).toBe(0)
    expect(firstPendingStepIndex(STEPS, new Map([["a", done("a")]]))).toBe(1)
    expect(firstPendingStepIndex(STEPS, new Map(STEPS.map((item) => [item.id, done(item.id)])))).toBe(2)
  })
  it("trava os passos depois do primeiro pendente", () => {
    expect(stepStates(STEPS, new Map(), 0)).toEqual(["current", "locked", "locked"])
    expect(stepStates(STEPS, new Map([["a", done("a")]]), 1)).toEqual(["completed", "current", "locked"])
    // Revendo um passo concluído: o primeiro pendente continua liberado.
    expect(stepStates(STEPS, new Map([["a", done("a")]]), 0)).toEqual(["current", "available", "locked"])
  })
})

describe("checkpointStatuses", () => {
  const checkpoints = [{ id: 1, instruction: "um" }, { id: 2, instruction: "dois" }, { id: 3, instruction: "sem caso" }]
  it("fica pendente antes de verificar", () => {
    expect([...checkpointStatuses(checkpoints, null).values()]).toEqual(["pending", "pending", "pending"])
  })
  it("marca ✓/✗ pelos casos de cada instrução", () => {
    const statuses = checkpointStatuses(checkpoints, [result("x", true, 1), result("y", false, 2), result("z", true, 2)])
    expect(statuses.get(1)).toBe("passed")
    expect(statuses.get(2)).toBe("failed")
    expect(statuses.get(3)).toBe("pending")
  })
  it("instrução sem caso próprio acompanha a aprovação geral", () => {
    expect(checkpointStatuses(checkpoints, [result("x", true, 1), result("y", true, 2)]).get(3)).toBe("passed")
  })
})

describe("solução e progresso", () => {
  it("libera a solução após as tentativas, nunca com 0, e sempre com o passo concluído", () => {
    expect(canRevealSolution(undefined, 3)).toBe(false)
    expect(canRevealSolution(mergeStepProgress(undefined, "b", { attempts: 3 }), 3)).toBe(true)
    expect(canRevealSolution(mergeStepProgress(undefined, "b", { attempts: 50 }), 0)).toBe(false)
    expect(canRevealSolution(done("b"), 0)).toBe(true)
  })
  it("mergeStepProgress cria a linha que ainda não existia", () => {
    expect(mergeStepProgress(undefined, "b", { attempts: 2 })).toMatchObject({ step_id: "b", status: "in_progress", attempts: 2, hints_revealed: 0 })
  })
})

describe("código inicial e rascunho", () => {
  it("usa o código inicial do passo quando existe", () => {
    expect(initialStepFiles([step("a", 1, "exercicio", "x = 1")], 0, () => null)).toEqual([{ path: "main.py", content: "x = 1" }])
  })
  it("sem código inicial, continua do exercício anterior (rascunho antes do inicial)", () => {
    const steps = [step("a", 1, "exercicio", "inicial"), step("r", 2, "leitura"), step("b", 3)]
    expect(initialStepFiles(steps, 2, () => null)[0]?.content).toBe("inicial")
    expect(initialStepFiles(steps, 2, (id) => (id === "a" ? [{ path: "main.py", content: "meu código" }] : null))[0]?.content).toBe("meu código")
  })
  it("sem nada antes, abre um main.py vazio", () => {
    expect(initialStepFiles([step("a", 1)], 0, () => null)).toEqual([{ path: "main.py", content: "" }])
  })
  it("guarda e lê o rascunho; conteúdo corrompido é ignorado", () => {
    writeStepDraft("p1", [{ path: "main.py", content: "print(1)" }])
    expect(readStepDraft("p1")).toEqual([{ path: "main.py", content: "print(1)" }])
    window.localStorage.setItem("lvl:passo:p2", "{não é json")
    expect(readStepDraft("p2")).toBeNull()
    window.localStorage.setItem("lvl:passo:p3", JSON.stringify([{ path: 3 }]))
    expect(readStepDraft("p3")).toBeNull()
    expect(readStepDraft("nunca")).toBeNull()
  })
})
