import type { SubmissionResult } from "@levelusp/contracts"
import { HTTP_STATUS, isApiError } from "@/lib/api/client"
import { parsePythonError } from "@/lib/python/parse-python-error"
import type { ConsoleOutput, ConsoleOutputType } from "@/lib/types"

/** Linha a ser exibida no console da IDE, antes de ganhar id e horário. */
export interface ConsoleLine {
  type: ConsoleOutputType
  message: string
  figureB64?: string
}

export function toConsoleOutput({ type, message, figureB64 }: ConsoleLine): ConsoleOutput {
  return { id: crypto.randomUUID(), type, message, timestamp: new Date(), ...(figureB64 ? { figureB64 } : {}) }
}

/** Uma linha por linha não vazia do stdout. */
export function stdoutLines(stdout: string): ConsoleLine[] {
  return stdout
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => ({ type: "output", message: line }))
}

/**
 * O que o programa escreveu em sys.stderr (avisos, `print(..., file=sys.stderr)`).
 * É exibido, mas não reprova a execução: o "Verificar" também só reprova por exceção.
 */
export function stderrLines(stderr: string): ConsoleLine[] {
  return stderr
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => ({ type: "warning", message: line }))
}

/** Erro do Python explicado para iniciantes, seguido da mensagem original e de uma dica. */
export function pythonErrorLines(rawError: string): ConsoleLine[] {
  const parsed = parsePythonError(rawError)
  return [
    { type: "error", message: `${parsed.title}: ${parsed.explanation}` },
    { type: "warning", message: `Erro original: ${parsed.original}` },
    { type: "warning", message: `💡 Dica: ${parsed.hint}` },
  ]
}

/** Feedback de "Verificar" quando a correção foi concluída mas reprovou. */
export function verificationFailureLines(result: SubmissionResult): ConsoleLine[] {
  const failedCount = result.failures + result.errors
  const failedCases = (result.cases ?? []).filter((testCase) => !testCase.passed)
  const details: ConsoleLine[] = failedCases.length
    ? failedCases.map((testCase) => ({
        type: "warning",
        message: testCase.message ? `${testCase.name}: ${testCase.message}` : testCase.name,
      }))
    : result.failureDetails.map((message) => ({ type: "warning", message }))
  return [
    { type: "error", message: `${failedCount} de ${result.testsRun} testes falharam.` },
    ...details,
    { type: "info", message: "Continue tentando! Leia o feedback acima e ajuste seu código." },
  ]
}

/**
 * Feedback de "Verificar" quando a chamada falhou. Sessão expirada não vira linha
 * no console: quem chama redireciona para o login.
 */
export function verificationErrorLine(error: unknown): ConsoleLine {
  if (!isApiError(error) || error.status === HTTP_STATUS.NETWORK_ERROR) {
    return { type: "error", message: "Erro de conexão ao verificar. Verifique sua internet e tente novamente." }
  }
  if (error.status === HTTP_STATUS.NOT_FOUND) return { type: "error", message: "Lição não encontrada no servidor." }
  if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) return { type: "warning", message: error.message }
  return { type: "error", message: error.message }
}

export function verificationSuccessLine(result: SubmissionResult): ConsoleLine {
  return {
    type: "success",
    message:
      result.xp_awarded > 0
        ? `✓ Todos os testes passaram! +${result.xp_awarded} XP conquistado!`
        : "✓ Todos os testes passaram! (Você já tinha concluído esta lição.)",
  }
}
