/**
 * Erros de aplicação com código estável e mensagem em pt-BR segura para o
 * usuário. Serviços lançam estes; o filtro global converte em HTTP.
 */
export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly issues?: { path: string; message: string }[],
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const NotFound = (what = "Recurso") => new AppError(404, "NOT_FOUND", `${what} não encontrado.`)
export const Forbidden = (message = "Você não tem permissão para esta ação.") => new AppError(403, "FORBIDDEN", message)
export const Unauthorized = (message = "Faça login para continuar.") => new AppError(401, "UNAUTHENTICATED", message)
export const Conflict = (message: string, code = "CONFLICT") => new AppError(409, code, message)
export const BadRequest = (message: string, code = "BAD_REQUEST") => new AppError(400, code, message)
export const Unprocessable = (message: string, code = "UNPROCESSABLE") => new AppError(422, code, message)
export const TooManyRequests = (message = "Muitas tentativas seguidas. Aguarde um instante.") =>
  new AppError(429, "RATE_LIMITED", message)
export const ServiceUnavailable = (message: string, code = "UNAVAILABLE") => new AppError(503, code, message)
