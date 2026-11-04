import type { Server } from "node:http"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import { Logger } from "nestjs-pino"
import { ENV } from "./config/config.module"
import type { Env } from "./config/env"
import { SESSION_COOKIE } from "./common/http/request"

const JSON_BODY_LIMIT = "1mb"

/** Opções de {@link configureApp}; os testes e2e desligam o logger pino (`useLogger: false`). */
export interface ConfigureAppOptions {
  useLogger?: boolean
}

/** Configuração HTTP compartilhada entre a aplicação real e os testes e2e. */
export function configureApp(app: NestExpressApplication, options: ConfigureAppOptions = {}): Env {
  const env = app.get<Env>(ENV)
  if (options.useLogger !== false) app.useLogger(app.get(Logger))
  app.set("trust proxy", env.TRUST_PROXY ? 1 : false)
  app.disable("x-powered-by")
  app.useBodyParser("json", { limit: JSON_BODY_LIMIT })
  app.use(
    helmet({
      // A API só serve JSON e imagens; o front tem sua própria CSP.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  )
  app.use(cookieParser())
  app.setGlobalPrefix("api")
  app.enableShutdownHooks()
  if (env.SWAGGER_ENABLED) setupSwagger(app)
  return env
}

/**
 * Conexões ociosas ficam abertas mais tempo do que as dos proxies na frente da API (o rewrite do
 * Next reaproveita sockets; o cloudflared, por até 90 s). Com o padrão do Node (5 s), a API fecha
 * um socket no instante em que o proxy o reutiliza e o aluno recebe 500/502 — visto no teste de
 * carga num Verificar (docs/v2/desempenho-e-carga.md). Quem fecha primeiro tem de ser o cliente.
 */
export const KEEP_ALIVE_TIMEOUT_MS = 65_000
/** O Node exige `headersTimeout` maior que `keepAliveTimeout`. */
export const HEADERS_TIMEOUT_MS = 66_000

/** Ajusta os tempos de keep-alive do servidor HTTP da API (ver {@link KEEP_ALIVE_TIMEOUT_MS}). */
export function configureHttpServer(server: Server): void {
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS
  server.headersTimeout = HEADERS_TIMEOUT_MS
}

function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle("LevelUSP API")
    .setVersion(process.env.APP_VERSION ?? "dev")
    .addCookieAuth(SESSION_COOKIE)
    .build()
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config))
}
