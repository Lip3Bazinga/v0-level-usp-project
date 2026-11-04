export type ConsoleOutputType = "info" | "success" | "error" | "warning" | "output" | "figure"

/** Linha do console da IDE (execução Python no navegador). */
export interface ConsoleOutput {
  id: string
  type: ConsoleOutputType
  message: string
  timestamp: Date
  /** PNG em base64 quando `type === "figure"` (gráficos do matplotlib). */
  figureB64?: string
}
