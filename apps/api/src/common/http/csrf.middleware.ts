import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { NextFunction, Request, Response } from "express"
import { CSRF_HEADER } from "./request"

const SAFE = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * Defesa CSRF por cabeçalho customizado: navegadores não enviam cabeçalhos
 * customizados em requisições entre sites sem preflight CORS — e a API não
 * habilita CORS. Somado ao cookie SameSite=Lax, bloqueia formulários forjados.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (SAFE.has(req.method) || req.headers[CSRF_HEADER] === "1") return next()
    res.status(403).json({ statusCode: 403, code: "CSRF", message: "Requisição bloqueada por segurança. Recarregue a página." })
  }
}
