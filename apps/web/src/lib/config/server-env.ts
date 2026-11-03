import { parsePublicOrigin, productionOriginProblem } from "@levelusp/contracts"
import { z } from "zod"
import type { RuntimeEnv } from "./server-urls"

/*
 * Validação das variáveis de execução do servidor web (fail fast, como a API).
 * Roda uma vez na partida (`instrumentation.ts`); com erro, o processo encerra
 * com a lista de problemas em português em vez de servir links errados.
 */

const emptyAsUndefined = (value: unknown): unknown => (typeof value === "string" && value.trim() === "" ? undefined : value)
const HTTP_URL_PATTERN = /^https?:\/\/[^\s/]+/
type OptionalHttpUrl = z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, unknown>
const optionalHttpUrl = (message: string): OptionalHttpUrl => z.preprocess(emptyAsUndefined, z.string().url(message).regex(HTTP_URL_PATTERN, message).optional())

const serverEnvSchema = z
  .object({
    APP_ENV: z.preprocess(emptyAsUndefined, z.enum(["dev", "test", "homolog", "prod"]).optional()),
    PORT: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1, "porta inválida").max(65_535, "porta inválida").optional()),
    API_INTERNAL_URL: optionalHttpUrl("use a URL interna da API, ex.: http://api:4000"),
    PUBLIC_BASE_URL: z.preprocess(emptyAsUndefined, z.string().optional()),
    APP_ORIGIN: z.preprocess(emptyAsUndefined, z.string().optional()),
  })
  .superRefine((env, ctx) => {
    const raw = env.PUBLIC_BASE_URL ?? env.APP_ORIGIN
    if (raw === undefined) {
      if (env.APP_ENV === "prod") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["PUBLIC_BASE_URL"], message: "obrigatória em prod (ex.: https://levelusp.exemplo.usp.br)" })
      }
      return
    }
    const parsed = parsePublicOrigin(raw)
    const problem = !parsed.ok ? parsed.reason : env.APP_ENV === "prod" ? productionOriginProblem(parsed.origin) : null
    if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["PUBLIC_BASE_URL"], message: problem })
  })

/** Configuração do servidor do front já validada. */
export type ServerEnv = z.infer<typeof serverEnvSchema>

/** Configuração inválida; `issues` lista cada variável com o problema em pt-BR. */
export class ServerEnvError extends Error {
  constructor(readonly issues: string[]) {
    super(`Configuração inválida do front (variáveis de ambiente):\n${issues.map((issue) => `  - ${issue}`).join("\n")}`)
    this.name = "ServerEnvError"
  }
}

/**
 * Valida as variáveis do servidor do front.
 *
 * @throws ServerEnvError com todas as variáveis inválidas de uma vez.
 */
export function validateServerEnv(source: RuntimeEnv): ServerEnv {
  const parsed = serverEnvSchema.safeParse(source)
  if (parsed.success) return parsed.data
  throw new ServerEnvError(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`))
}
