/** Linha do console do IDE (execução Python no navegador). */
export type ConsoleOutput = {
  id: string
  type: "info" | "success" | "error" | "warning" | "output" | "figure"
  message: string
  timestamp: Date
  figureB64?: string  // base64 PNG para type === "figure"
}

/**
 * Resultado da avaliação de testes (unittest). Fonte única — antes duplicado
 * como `TestResult` (use-python) e `EvaluateResult` (evaluate).
 */
export interface TestResult {
  testsRun: number
  passed: number
  failures: number
  errors: number
  allPassed: boolean
  failureDetails: string[]
}
