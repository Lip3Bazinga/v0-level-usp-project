import { z } from "zod"

/**
 * Variáveis de ambiente validadas na partida. A API se recusa a subir com
 * configuração inválida (fail fast) — melhor do que falhar no meio de uma aula.
 */
const bool = z
  .enum(["true", "false", "1", "0"])
  .transform((v) => v === "true" || v === "1")

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Ambiente lógico: define defaults de segurança e o que é exposto. */
    APP_ENV: z.enum(["dev", "test", "homolog", "prod"]).default("dev"),
    PORT: z.coerce.number().int().default(4000),
    /** Origem pública do front (ex.: https://xxx.trycloudflare.com). Usada em links de e-mail e checagem de Origin. */
    APP_ORIGIN: z.url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    RUNNER_URL: z.url().default("http://localhost:8081"),
    RUNNER_TOKEN: z.string().min(24),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    /** Atrás do túnel/proxy reverso: confia no X-Forwarded-For do primeiro salto. */
    TRUST_PROXY: bool.default(true),
    COOKIE_SECURE: bool.optional(),
    UPLOAD_DIR: z.string().default("./data/uploads"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
    SWAGGER_ENABLED: bool.optional(),
    /** Cadastro aberto? Em homolog pode ser fechado (só convites). */
    SIGNUP_ENABLED: bool.default(true),
    SMTP_URL: z.string().optional(),
    MAIL_FROM: z.string().default("LevelUSP <nao-responda@levelusp.local>"),
  })
  .transform((env) => ({
    ...env,
    COOKIE_SECURE: env.COOKIE_SECURE ?? (env.APP_ENV === "homolog" || env.APP_ENV === "prod"),
    SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? env.APP_ENV === "dev",
  }))

export type Env = z.infer<typeof envSchema>

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")
    throw new Error(`Configuração inválida:\n${issues}`)
  }
  return parsed.data
}
