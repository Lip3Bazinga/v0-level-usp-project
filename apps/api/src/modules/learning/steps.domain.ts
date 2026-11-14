import type { CaseResult, StepCaseResult, StepQuizQuestionInput, StepQuizReview, TestCase } from "@levelusp/contracts"

/** O mínimo de um passo para decidir a ordem. */
export interface OrderedStep {
  id: string
  order: number
}

/**
 * Passos são sequenciais: devolve o primeiro passo ANTERIOR a `target` que o aluno ainda
 * não concluiu (o que trava o acesso), ou null quando `target` está liberado.
 */
export function findBlockingStep<Step extends OrderedStep>(steps: readonly Step[], completedIds: ReadonlySet<string>, target: OrderedStep): Step | null {
  const earlier = steps.filter((step) => step.order < target.order && !completedIds.has(step.id))
  return earlier.reduce<Step | null>((first, step) => (first === null || step.order < first.order ? step : first), null)
}

/** A solução é liberada depois de `solutionAfterAttempts` verificações reprovadas; 0 = nunca. */
export function isSolutionAvailable(attempts: number, solutionAfterAttempts: number): boolean {
  return solutionAfterAttempts > 0 && attempts >= solutionAfterAttempts
}

/** Casos como o aluno vê no passo: a dica do professor (só quando o caso falha) e a instrução que ele cobre. */
export function toStepCases(cases: readonly CaseResult[], testCases: readonly TestCase[]): StepCaseResult[] {
  const byId = new Map(testCases.map((testCase) => [testCase.id, testCase]))
  return cases.map((result) => {
    const testCase = byId.get(result.id)
    return { ...result, hint: result.passed ? null : (testCase?.hint ?? null), checkpoint: testCase?.checkpoint ?? null }
  })
}

/** Correção do quiz de um passo. */
export interface StepQuizGrade {
  score: number
  passed: boolean
  correctCount: number
  total: number
  review: StepQuizReview[]
}

/**
 * Corrige o quiz do passo pela posição das questões. Nota = acertos/total × 100 (inteiro);
 * aprovado com nota ≥ `passingScore`. Resposta faltando ou a mais conta como erro/é ignorada.
 * A explicação só acompanha a questão acertada, ou todas quando o quiz foi aprovado: numa
 * reprovação ela entregaria a resposta certa antes da nova tentativa.
 */
export function gradeStepQuiz(questions: readonly StepQuizQuestionInput[], answers: readonly number[], passingScore: number): StepQuizGrade {
  const corrections = questions.map((question, index) => answers[index] === question.correct_index)
  const correctCount = corrections.filter(Boolean).length
  const total = questions.length
  const score = total ? Math.round((correctCount / total) * 100) : 0
  const passed = total > 0 && score >= passingScore
  const review = questions.map((question, index) => {
    const correct = corrections[index] ?? false
    return { index, correct, explanation: correct || passed ? question.explanation : "" }
  })
  return { score, passed, correctCount, total, review }
}

/**
 * Forma canônica de uma saída para a previsão: quebras `\r\n` viram `\n`, espaços e
 * tabulações no fim de cada linha somem e as linhas em branco do fim são descartadas.
 * Espaços no começo ou no meio da linha e linhas em branco intermediárias CONTAM.
 */
export function normalizePredictionOutput(output: string): string {
  const lines = output.replace(/\r\n?/g, "\n").split("\n").map((line) => line.replace(/[ \t]+$/, ""))
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop()
  return lines.join("\n")
}

/** A previsão do aluno bate com a saída esperada (ambas na forma canônica de {@link normalizePredictionOutput}). */
export function matchesPrediction(expectedOutput: string, prediction: string): boolean {
  return normalizePredictionOutput(prediction) === normalizePredictionOutput(expectedOutput)
}
