import type { DraftProjectVerdict, DraftStepVerifyResult, GradeResult, StepSubmitResult, TestCase } from "@levelusp/contracts"
import { toStepCases } from "../learning/steps.domain"
import type { StarterCode, StepVerificationGrades, StepVerificationOutcome } from "./step-verification.domain"

/** Veredito de um projeto: `shouldPass` é o esperado (true só para a solução de referência). */
function toProjectVerdict(result: GradeResult, shouldPass: boolean): DraftProjectVerdict {
  return { passed: result.allPassed, as_expected: result.allPassed === shouldPass, failed_cases: result.cases.filter((caseResult) => !caseResult.passed) }
}

/** Resposta do "Testar gabarito" de um passo: um veredito por projeto e os motivos dos problemas. */
export function toDraftStepVerifyResult(order: number, starter: StarterCode | null, grades: StepVerificationGrades, outcome: StepVerificationOutcome): DraftStepVerifyResult {
  return {
    order,
    status: outcome.status,
    solution: toProjectVerdict(grades.solution, true),
    starter:
      grades.starter && starter
        ? { ...toProjectVerdict(grades.starter, false), inherited_from: starter.inheritedFrom, shuffled_order: starter.isShuffledOrder === true }
        : null,
    wrong_solutions: grades.wrong.map((entry) => ({ ...toProjectVerdict(entry.result, false), name: entry.name })),
    details: outcome.details,
  }
}

/** Resposta do teste de um passo em que nada rodou (as linhas de ordenar não montam a solução). */
export function toUnverifiableStepResult(order: number, detail: string): DraftStepVerifyResult {
  return { order, status: "falha", solution: null, starter: null, wrong_solutions: [], details: [detail] }
}

/**
 * Resposta do "Verificar" da prévia no formato do aluno, com o efeito na gamificação sempre
 * zerado: nada é gravado, então não há passo concluído, XP, tentativas nem badge.
 */
export function toDraftStepSubmitResult(order: number, result: GradeResult, testCases: readonly TestCase[]): StepSubmitResult {
  return {
    step_completed: false,
    xp_awarded: 0,
    lesson_completed: false,
    granted_badges: [],
    level_up: false,
    new_level: 0,
    step_id: `rascunho-${order}`,
    passed: result.allPassed,
    cases: toStepCases(result.cases, testCases),
    attempts: 0,
    solution_available: true,
  }
}
