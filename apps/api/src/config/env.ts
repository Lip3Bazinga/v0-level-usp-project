import { z } from "zod"
import { parsePublicOrigin, productionOriginProblem } from "@levelusp/contracts"

/**
 * Variáveis de ambiente validadas na partida. A API se recusa a subir com
 * configuração inválida (fail fast) — melhor do que falhar no meio de uma aula.
 */
const booleanFlag = z
  .enum(["true", "false", "1", "0"])
  .transform((flag) => flag === "true" || flag === "1")

/** O compose repassa `${VAR:-}` como string vazia: vazio conta como "não definido". */
const emptyAsUndefined = (value: unknown): unknown => (value === "" ? undefined : value)
const optionalText = z.preprocess(emptyAsUndefined, z.string().optional())

const DEV_PUBLIC_BASE_URL = "http://localhost:3000"
const ENVS_REQUIRING_PUBLIC_URL: ReadonlySet<string> = new Set(["homolog", "prod"])
const SMTP_URL_PATTERN = /^smtps?:\/\/[^\s]+$/
/** "Nome <email@dominio>" ou só "email@dominio". */
const MAIL_FROM_PATTERN = /^(?:[^<>]*<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>|[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)$/

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    /** Ambiente lógico: define defaults de segurança e o que é exposto. */
    APP_ENV: z.enum(["dev", "test", "homolog", "prod"]).default("dev"),
    PORT: z.coerce.number().int().default(4000),
    /**
     * Origem pública do front (ex.: https://levelusp.exemplo.usp.br). Fonte única dos
     * links absolutos: e-mails de senha/convite e verificação do certificado (PDF).
     */
    PUBLIC_BASE_URL: optionalText,
    /** Nome antigo de PUBLIC_BASE_URL (notebook + Quick Tunnel); só vale se PUBLIC_BASE_URL faltar. */
    APP_ORIGIN: optionalText,
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    RUNNER_URL: z.url().default("http://localhost:8081"),
    RUNNER_TOKEN: z.string().min(24, "precisa ter pelo menos 24 caracteres (gere com: openssl rand -hex 24)"),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    /** Atrás do túnel/proxy reverso: confia no X-Forwarded-For do primeiro salto. */
    TRUST_PROXY: booleanFlag.default(true),
    COOKIE_SECURE: booleanFlag.optional(),
    UPLOAD_DIR: z.string().default("./data/uploads"),
    LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).default("info"),
    SWAGGER_ENABLED: booleanFlag.optional(),
    /** Cadastro aberto? Em homolog pode ser fechado (só convites). */
    SIGNUP_ENABLED: booleanFlag.default(true),
    /** smtp://usuario:senha@host:587 (STARTTLS) ou smtps://usuario:senha@host:465 (TLS direto). */
    SMTP_URL: z.preprocess(
      emptyAsUndefined,
      z.string().regex(SMTP_URL_PATTERN, "use smtp://usuario:senha@host:587 (STARTTLS) ou smtps://usuario:senha@host:465 (TLS)").optional(),
    ),
    /** Em smtp:// (porta 587), recusa enviar sem STARTTLS. Padrão: ligado fora de dev/test. */
    SMTP_REQUIRE_TLS: z.preprocess(emptyAsUndefined, booleanFlag.optional()),
    /** Teto de cada etapa da conexão SMTP (conexão, saudação, inatividade). */
    SMTP_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(15_000),
    /** Tentativas por e-mail em falhas temporárias (rede, 4xx do servidor SMTP). */
    MAIL_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
    MAIL_FROM: z
      .string()
      .regex(MAIL_FROM_PATTERN, "use \"Nome <endereco@dominio>\" ou só o endereço")
      .default("LevelUSP <nao-responda@levelusp.local>"),
  })
  .transform((env, ctx) => {
    const { APP_ORIGIN: legacyOrigin, PUBLIC_BASE_URL: configuredOrigin, ...rest } = env
    const publicBaseUrl = resolvePublicBaseUrl(env.APP_ENV, configuredOrigin ?? legacyOrigin)
    if (!publicBaseUrl.ok) {
      ctx.addIssue({ code: "custom", path: ["PUBLIC_BASE_URL"], message: publicBaseUrl.reason })
      return z.NEVER
    }
    const isDeployed = env.APP_ENV === "homolog" || env.APP_ENV === "prod"
    return {
      ...rest,
      PUBLIC_BASE_URL: publicBaseUrl.origin,
      COOKIE_SECURE: env.COOKIE_SECURE ?? isDeployed,
      SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? env.APP_ENV === "dev",
      SMTP_REQUIRE_TLS: env.SMTP_REQUIRE_TLS ?? isDeployed,
    }
  })

export type Env = z.infer<typeof envSchema>

type PublicBaseUrlResult = { ok: true; origin: string } | { ok: false; reason: string }

function resolvePublicBaseUrl(appEnv: Env["APP_ENV"], raw: string | undefined): PublicBaseUrlResult {
  if (raw === undefined) {
    if (ENVS_REQUIRING_PUBLIC_URL.has(appEnv)) {
      return { ok: false, reason: `obrigatória em ${appEnv}: defina a origem pública (ex.: https://levelusp.exemplo.usp.br); sem ela os links de e-mail e do certificado apontariam para localhost` }
    }
    return { ok: true, origin: DEV_PUBLIC_BASE_URL }
  }
  const parsed = parsePublicOrigin(raw)
  if (!parsed.ok) return parsed
  const problem = appEnv === "prod" ? productionOriginProblem(parsed.origin) : null
  return problem ? { ok: false, reason: problem } : parsed
}

/** Mensagens padrão do Zod em português (as regras acima já têm as suas). */
const PT_BR_ERRORS = z.locales.pt().localeError

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source, { error: PT_BR_ERRORS })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n")
    throw new Error(`Configuração inválida da API (variáveis de ambiente):\n${issues}\nVeja infra/env/vm.env.example e docs/v2/producao-vm.md.`)
  }
  return parsed.data
}
