export type { TestResult, CaseResult, SubmissionResult } from "@levelusp/contracts"

/** Linha do console do IDE (execução Python no navegador). Tipo puramente de UI. */
export type ConsoleOutput = {
  id: string
  type: "info" | "success" | "error" | "warning" | "output" | "figure"
  message: string
  timestamp: Date
  figureB64?: string  // base64 PNG para type === "figure"
}
