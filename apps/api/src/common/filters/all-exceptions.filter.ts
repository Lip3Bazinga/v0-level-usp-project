import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from "@nestjs/common"
import { ThrottlerException } from "@nestjs/throttler"
import type { Request, Response } from "express"
import type { ApiErrorBody } from "@levelusp/contracts"
import { AppError } from "../errors/app-error"

interface ErrorDescription {
  code: string
  message: string
}

const HTTP_ERRORS = {
  400: { code: "BAD_REQUEST", message: "Requisição inválida." },
  401: { code: "UNAUTHENTICATED", message: "Faça login para continuar." },
  403: { code: "FORBIDDEN", message: "Você não tem permissão para esta ação." },
  404: { code: "NOT_FOUND", message: "Recurso não encontrado." },
  413: { code: "PAYLOAD_TOO_LARGE", message: "Conteúdo grande demais." },
  429: { code: "RATE_LIMITED", message: "Muitas tentativas seguidas. Aguarde um instante." },
} as const satisfies Record<number, ErrorDescription>

type KnownStatus = keyof typeof HTTP_ERRORS

const GENERIC_HTTP_ERROR: ErrorDescription = { code: "HTTP_ERROR", message: "Não foi possível concluir a requisição." }
const INTERNAL_ERROR: ApiErrorBody = { statusCode: 500, code: "INTERNAL", message: "Erro interno. Tente novamente em instantes." }

function isKnownStatus(status: number): status is KnownStatus {
  return Object.hasOwn(HTTP_ERRORS, status)
}

function describeStatus(status: number): ErrorDescription {
  return isKnownStatus(status) ? HTTP_ERRORS[status] : GENERIC_HTTP_ERROR
}

/** Erros do body-parser (JSON malformado, corpo grande demais) trazem só `status`. */
function bodyParserStatus(exception: unknown): 400 | 413 | null {
  if (typeof exception !== "object" || exception === null || !("status" in exception)) return null
  return exception.status === 400 || exception.status === 413 ? exception.status : null
}

/**
 * Converte qualquer exceção em `ApiErrorBody`. Erros inesperados viram 500
 * genérico: stack traces e mensagens internas ficam só no log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("HTTP")

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const response = http.getResponse<Response>()
    const request = http.getRequest<Request>()
    const body = this.toBody(exception)
    if (typeof request.id === "string") body.requestId = request.id
    if (exception instanceof AppError && exception.statusCode === 503) {
      // Dependência ocupada/fora do ar: esperado sob carga, sem stack (quem lançou já registrou a causa).
      this.logger.warn({ code: exception.code, path: request.url, requestId: body.requestId }, "serviço indisponível")
    } else if (body.statusCode >= 500) {
      this.logger.error({ err: exception, path: request.url, requestId: body.requestId }, "erro não tratado")
    }
    if (exception instanceof AppError && exception.retryAfterSeconds !== undefined) response.setHeader("Retry-After", String(exception.retryAfterSeconds))
    response.status(body.statusCode).json(body)
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof AppError) {
      return {
        statusCode: exception.statusCode,
        code: exception.code,
        message: exception.message,
        ...(exception.issues ? { issues: exception.issues } : {}),
      }
    }
    if (exception instanceof ThrottlerException) return { statusCode: 429, ...HTTP_ERRORS[429] }
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      return { statusCode: status, ...describeStatus(status) }
    }
    const status = bodyParserStatus(exception)
    if (status !== null) return { statusCode: status, ...HTTP_ERRORS[status] }
    return { ...INTERNAL_ERROR }
  }
}
