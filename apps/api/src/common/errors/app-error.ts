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

/** 404 com mensagem "<what> não encontrado." (também usado para esconder recurso de outro dono). */
export const NotFound = (what = "Recurso"): AppError => new AppError(404, "NOT_FOUND", `${what} não encontrado.`)
/** 403: autenticado, mas sem permissão (papel ou dono). */
export const Forbidden = (message = "Você não tem permissão para esta ação.", code = "FORBIDDEN"): AppError => new AppError(403, code, message)
/** 401: sem sessão válida. */
export const Unauthorized = (message = "Faça login para continuar."): AppError => new AppError(401, "UNAUTHENTICATED", message)
/** 409: conflito com o estado atual (duplicado, já revisado…); `code` permite ao cliente reagir. */
export const Conflict = (message: string, code = "CONFLICT"): AppError => new AppError(409, code, message)
/** 400 com mensagem própria (regra de negócio, não validação de schema). */
export const BadRequest = (message: string, code = "BAD_REQUEST"): AppError => new AppError(400, code, message)
/** 422: entrada válida, mas a operação não se aplica ao recurso (ex.: quiz sem questões). */
export const Unprocessable = (message: string, code = "UNPROCESSABLE"): AppError => new AppError(422, code, message)
/** 429 do limite por usuário; `issues` pode levar o momento de liberar. */
export const TooManyRequests = (message = "Muitas tentativas seguidas. Aguarde um instante.", code = "RATE_LIMITED", issues?: ValidationIssue[]): AppError =>
  new AppError(429, code, message, issues)
/** 503: dependência indisponível (ex.: executor fora do ar). */
export const ServiceUnavailable = (message: string, code = "UNAVAILABLE"): AppError => new AppError(503, code, message)
/** 400 de validação: a mensagem é a do primeiro problema; `issues` lista todos. */
export const ValidationFailed = (issues: ValidationIssue[]): AppError =>
  new AppError(400, "VALIDATION", issues[0]?.message ?? "Dados inválidos.", issues)
