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

function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle("LevelUSP API")
    .setVersion(process.env.APP_VERSION ?? "dev")
    .addCookieAuth(SESSION_COOKIE)
    .build()
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config))
}
