import { describe, expect, it } from "vitest"
import { loadEnv } from "./env"

const BASE: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgres://levelusp:levelusp@localhost:5432/levelusp",
  RUNNER_TOKEN: "token-de-teste-com-24-caracteres",
}

function load(overrides: NodeJS.ProcessEnv): ReturnType<typeof loadEnv> {
  return loadEnv({ ...BASE, ...overrides })
}

describe("PUBLIC_BASE_URL", () => {
  it("usa a origem configurada, sem barra final", () => {
    expect(load({ APP_ENV: "prod", PUBLIC_BASE_URL: "https://levelusp.exemplo.usp.br/" }).PUBLIC_BASE_URL).toBe("https://levelusp.exemplo.usp.br")
  })

  it("aceita APP_ORIGIN (nome antigo, fluxo do notebook) quando PUBLIC_BASE_URL falta ou está vazia", () => {
    expect(load({ APP_ENV: "homolog", APP_ORIGIN: "https://abc.trycloudflare.com" }).PUBLIC_BASE_URL).toBe("https://abc.trycloudflare.com")
    expect(load({ APP_ENV: "homolog", PUBLIC_BASE_URL: "", APP_ORIGIN: "https://abc.trycloudflare.com" }).PUBLIC_BASE_URL).toBe(
      "https://abc.trycloudflare.com",
    )
  })

  it("PUBLIC_BASE_URL tem precedência sobre APP_ORIGIN", () => {
    const env = load({ APP_ENV: "prod", PUBLIC_BASE_URL: "https://levelusp.exemplo.usp.br", APP_ORIGIN: "https://velho.trycloudflare.com" })
    expect(env.PUBLIC_BASE_URL).toBe("https://levelusp.exemplo.usp.br")
    expect(env).not.toHaveProperty("APP_ORIGIN")
  })

  it("em dev e test cai em http://localhost:3000", () => {
    expect(load({ APP_ENV: "dev" }).PUBLIC_BASE_URL).toBe("http://localhost:3000")
    expect(load({ APP_ENV: "test" }).PUBLIC_BASE_URL).toBe("http://localhost:3000")
  })

  it("é obrigatória em homolog e prod (falha na partida, com mensagem em português)", () => {
    expect(() => load({ APP_ENV: "prod" })).toThrow(/Configuração inválida da API[\s\S]*PUBLIC_BASE_URL: obrigatória em prod/)
    expect(() => load({ APP_ENV: "homolog" })).toThrow(/PUBLIC_BASE_URL: obrigatória em homolog/)
  })

  it("em produção recusa http e localhost", () => {
    expect(() => load({ APP_ENV: "prod", PUBLIC_BASE_URL: "http://levelusp.exemplo.usp.br" })).toThrow(/precisa ser https/)
    expect(() => load({ APP_ENV: "prod", PUBLIC_BASE_URL: "https://localhost:3000" })).toThrow(/não pode ser localhost/)
  })

  it("recusa caminho, parâmetros e URLs malformadas", () => {
    expect(() => load({ PUBLIC_BASE_URL: "https://usp.br/levelusp" })).toThrow(/só a origem/)
    expect(() => load({ PUBLIC_BASE_URL: "levelusp.usp.br" })).toThrow(/não é uma URL válida/)
    expect(() => load({ PUBLIC_BASE_URL: "ftp://levelusp.usp.br" })).toThrow(/http:\/\/ ou https:\/\//)
  })
})

describe("SMTP", () => {
  it("aceita smtp:// e smtps:// e liga TLS obrigatório fora de dev/test", () => {
    const prod = load({ APP_ENV: "prod", PUBLIC_BASE_URL: "https://levelusp.usp.br", SMTP_URL: "smtp://u:s@smtp.exemplo.com:587" })
    expect(prod).toMatchObject({ SMTP_URL: "smtp://u:s@smtp.exemplo.com:587", SMTP_REQUIRE_TLS: true, SMTP_TIMEOUT_MS: 15_000, MAIL_MAX_ATTEMPTS: 3 })
    expect(load({ APP_ENV: "dev", SMTP_URL: "smtp://localhost:1025" }).SMTP_REQUIRE_TLS).toBe(false)
    expect(load({ SMTP_URL: "smtps://u:s@smtp.exemplo.com:465", SMTP_REQUIRE_TLS: "false" }).SMTP_REQUIRE_TLS).toBe(false)
  })

  it("SMTP_URL vazio conta como não configurado", () => {
    expect(load({ SMTP_URL: "" }).SMTP_URL).toBeUndefined()
  })

  it("recusa esquema errado e remetente sem e-mail", () => {
    expect(() => load({ SMTP_URL: "https://smtp.exemplo.com" })).toThrow(/SMTP_URL: use smtp:\/\//)
    expect(() => load({ MAIL_FROM: "LevelUSP" })).toThrow(/MAIL_FROM/)
    expect(load({ MAIL_FROM: "LevelUSP <nao-responda@levelusp.usp.br>" }).MAIL_FROM).toBe("LevelUSP <nao-responda@levelusp.usp.br>")
  })

  it("mensagens padrão do Zod saem em português", () => {
    expect(() => load({ SMTP_TIMEOUT_MS: "10" })).toThrow(/SMTP_TIMEOUT_MS: .*(pequeno|menor)/i)
  })
})
