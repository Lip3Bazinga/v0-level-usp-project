import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { LoggerModule } from "nestjs-pino"
import { randomUUID } from "node:crypto"
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter"
import { CsrfMiddleware } from "./common/http/csrf.middleware"
import { IP_THROTTLE } from "./common/rate-limit/rate-limit.policies"
import { RateLimitModule } from "./common/rate-limit/rate-limit.module"
import { ConfigModule, ENV } from "./config/config.module"
import type { Env } from "./config/env"
import { DatabaseModule } from "./infra/database/database.module"
import { MailModule } from "./infra/mail/mail.module"
import { RunnerModule } from "./infra/runner/runner.module"
import { StorageModule } from "./infra/storage/storage.module"
import { FEATURE_MODULES } from "./modules"

const MAX_REQUEST_ID_LENGTH = 64

/** Reaproveita o id do proxy (correlação ponta a ponta) ou gera um novo. */
function requestIdFrom(header: string | string[] | undefined): string {
  return typeof header === "string" ? header.slice(0, MAX_REQUEST_ID_LENGTH) : randomUUID()
}

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: (request, response) => {
            const id = requestIdFrom(request.headers["x-request-id"])
            response.setHeader("x-request-id", id)
            return id
          },
          // Nunca logar credenciais nem o cookie de sessão.
          redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]', "req.body.password"],
          customProps: () => ({ env: env.APP_ENV }),
          autoLogging: { ignore: (request) => request.url?.startsWith("/api/health") ?? false },
          ...(env.APP_ENV === "dev" ? { transport: { target: "pino-pretty", options: { singleLine: true } } } : {}),
        },
      }),
    }),
    ThrottlerModule.forRoot({ throttlers: [{ name: "default", ttl: IP_THROTTLE.windowMs, limit: IP_THROTTLE.globalLimit }] }),
    DatabaseModule,
    MailModule,
    RunnerModule,
    StorageModule,
    RateLimitModule,
    ...FEATURE_MODULES,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfMiddleware).forRoutes("*path")
  }
}
