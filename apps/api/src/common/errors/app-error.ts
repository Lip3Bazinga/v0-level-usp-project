import type { ValidationIssue } from "@levelusp/contracts"

/**
 * Erros de aplicação com código estável e mensagem em pt-BR segura para o
 * usuário. Serviços lançam estes; o filtro global converte em HTTP.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly issues?: ValidationIssue[],
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const NotFound = (what = "Recurso"): AppError => new AppError(404, "NOT_FOUND", `${what} não encontrado.`)
export const Forbidden = (message = "Você não tem permissão para esta ação.", code = "FORBIDDEN"): AppError => new AppError(403, code, message)
export const Unauthorized = (message = "Faça login para continuar."): AppError => new AppError(401, "UNAUTHENTICATED", message)
export const Conflict = (message: string, code = "CONFLICT"): AppError => new AppError(409, code, message)
export const BadRequest = (message: string, code = "BAD_REQUEST"): AppError => new AppError(400, code, message)
export const Unprocessable = (message: string, code = "UNPROCESSABLE"): AppError => new AppError(422, code, message)
export const TooManyRequests = (message = "Muitas tentativas seguidas. Aguarde um instante.", code = "RATE_LIMITED", issues?: ValidationIssue[]): AppError =>
  new AppError(429, code, message, issues)
export const ServiceUnavailable = (message: string, code = "UNAVAILABLE"): AppError => new AppError(503, code, message)
/** 400 de validação: a mensagem é a do primeiro problema; `issues` lista todos. */
export const ValidationFailed = (issues: ValidationIssue[]): AppError =>
  new AppError(400, "VALIDATION", issues[0]?.message ?? "Dados inválidos.", issues)
