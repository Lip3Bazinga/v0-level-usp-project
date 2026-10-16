import type { INestApplication } from "@nestjs/common"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import cookieParser from "cookie-parser"
import helmet from "helmet"
import { Logger } from "nestjs-pino"
import { ENV } from "./config/config.module"
import type { Env } from "./config/env"

/** Configuração HTTP compartilhada entre a aplicação real e os testes e2e. */
export function configureApp(app: NestExpressApplication | INestApplication, opts: { useLogger?: boolean } = {}) {
  const env = app.get<Env>(ENV)
  const express = app as NestExpressApplication
  if (opts.useLogger !== false) app.useLogger(app.get(Logger))
  express.set("trust proxy", env.TRUST_PROXY ? 1 : false)
  express.disable("x-powered-by")
  express.useBodyParser("json", { limit: "1mb" })
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

  if (env.SWAGGER_ENABLED) {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("LevelUSP API").setVersion(process.env.APP_VERSION ?? "dev").addCookieAuth("lvl_session").build(),
    )
    SwaggerModule.setup("api/docs", app, doc)
  }
  return env
}
