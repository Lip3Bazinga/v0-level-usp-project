import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, Logger } from "@nestjs/common"
import { ThrottlerException } from "@nestjs/throttler"
import type { Request, Response } from "express"
import type { ApiErrorBody } from "@levelusp/contracts"
import { AppError } from "../errors/app-error"

const DEFAULT_MESSAGES: Record<number, [string, string]> = {
  400: ["BAD_REQUEST", "Requisição inválida."],
  401: ["UNAUTHENTICATED", "Faça login para continuar."],
  403: ["FORBIDDEN", "Você não tem permissão para esta ação."],
  404: ["NOT_FOUND", "Recurso não encontrado."],
  413: ["PAYLOAD_TOO_LARGE", "Conteúdo grande demais."],
  429: ["RATE_LIMITED", "Muitas tentativas seguidas. Aguarde um instante."],
}

/**
 * Converte qualquer exceção em `ApiErrorBody`. Erros inesperados viram 500
 * genérico: stack traces e mensagens internas ficam só no log.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("HTTP")

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()
    const req = ctx.getRequest<Request>()
    const body = this.toBody(exception)
    body.requestId = typeof req.id === "string" ? req.id : undefined
    if (body.statusCode >= 500) {
      this.logger.error({ err: exception, path: req.url, requestId: body.requestId }, "erro não tratado")
    }
    res.status(body.statusCode).json(body)
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof AppError) {
      return { statusCode: exception.statusCode, code: exception.code, message: exception.message, issues: exception.issues }
    }
    if (exception instanceof ThrottlerException) {
      const [code, message] = DEFAULT_MESSAGES[429]!
      return { statusCode: 429, code, message }
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const [code, message] = DEFAULT_MESSAGES[status] ?? ["HTTP_ERROR", "Não foi possível concluir a requisição."]
      return { statusCode: status, code, message }
    }
    // body-parser: JSON malformado / corpo grande demais
    const status = (exception as { status?: number; type?: string })?.status
    if (status === 400 || status === 413) {
      const [code, message] = DEFAULT_MESSAGES[status]!
      return { statusCode: status, code, message }
    }
    return { statusCode: 500, code: "INTERNAL", message: "Erro interno. Tente novamente em instantes." }
  }
}
