import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { LoggerModule } from "nestjs-pino"
import { randomUUID } from "node:crypto"
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter"
import { CsrfMiddleware } from "./common/http/csrf.middleware"
import { RateLimitModule } from "./common/rate-limit/rate-limit.module"
import { ConfigModule, ENV } from "./config/config.module"
import type { Env } from "./config/env"
import { DatabaseModule } from "./infra/database/database.module"
import { MailModule } from "./infra/mail/mail.module"
import { RunnerModule } from "./infra/runner/runner.module"
import { StorageModule } from "./infra/storage/storage.module"
import { FEATURE_MODULES } from "./modules"

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          genReqId: (req, res) => {
            const id = (req.headers["x-request-id"] as string | undefined)?.slice(0, 64) ?? randomUUID()
            res.setHeader("x-request-id", id)
            return id
          },
          // Nunca logar credenciais nem o cookie de sessão.
          redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]', "req.body.password"],
          customProps: () => ({ env: env.APP_ENV }),
          autoLogging: { ignore: (req) => req.url?.startsWith("/api/health") ?? false },
          transport: env.APP_ENV === "dev" ? { target: "pino-pretty", options: { singleLine: true } } : undefined,
        },
      }),
    }),
    ThrottlerModule.forRoot({ throttlers: [{ name: "default", ttl: 60_000, limit: 300 }] }),
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
  configure(consumer: MarkMiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes("*path")
  }
}

type MarkMiddlewareConsumer = MiddlewareConsumer
