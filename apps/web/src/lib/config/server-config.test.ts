import { describe, expect, it } from "vitest"
import { ServerEnvError, validateServerEnv } from "./server-env"
import { resolvePublicBaseUrl, resolveServerApiBaseUrl } from "./server-urls"
import { buildRootMetadata } from "./site-metadata"

const PUBLIC_BASE_URL = "https://levelusp.exemplo.usp.br"

describe("resolveServerApiBaseUrl (SSR → API, UX-02)", () => {
  it("usa API_INTERNAL_URL lida em tempo de execução", () => {
    expect(resolveServerApiBaseUrl({ API_INTERNAL_URL: "http://api:4000/" })).toBe("http://api:4000")
  })

  it("sem a variável, passa pelo próprio Next (nunca localhost:4000)", () => {
    expect(resolveServerApiBaseUrl({ PORT: "3001" })).toBe("http://127.0.0.1:3001")
    expect(resolveServerApiBaseUrl({ API_INTERNAL_URL: "" })).toBe("http://127.0.0.1:3000")
  })
})

describe("resolvePublicBaseUrl", () => {
  it("usa PUBLIC_BASE_URL, depois APP_ORIGIN (nome antigo)", () => {
    expect(resolvePublicBaseUrl({ PUBLIC_BASE_URL: `${PUBLIC_BASE_URL}/`, APP_ORIGIN: "http://localhost:3000" })).toBe(PUBLIC_BASE_URL)
    expect(resolvePublicBaseUrl({ APP_ORIGIN: "https://abc.trycloudflare.com" })).toBe("https://abc.trycloudflare.com")
  })

  it("sem configuração (dev), cai na porta local", () => {
    expect(resolvePublicBaseUrl({ PORT: "3001" })).toBe("http://localhost:3001")
  })
})

describe("buildRootMetadata", () => {
  it("Open Graph e metadataBase usam a origem configurada", () => {
    const metadata = buildRootMetadata(PUBLIC_BASE_URL)
    expect(metadata.metadataBase?.toString()).toBe(`${PUBLIC_BASE_URL}/`)
    expect(metadata.openGraph?.url).toBe(PUBLIC_BASE_URL)
  })
})

describe("validateServerEnv (partida do servidor web)", () => {
  it("aceita a configuração da VM", () => {
    expect(validateServerEnv({ APP_ENV: "prod", PUBLIC_BASE_URL, API_INTERNAL_URL: "http://api:4000", PORT: "3000" })).toMatchObject({
      APP_ENV: "prod",
      PUBLIC_BASE_URL,
    })
  })

  it("dev sem nada configurado é válido", () => {
    expect(() => validateServerEnv({})).not.toThrow()
  })

  it("em prod exige origem https pública e explica em português", () => {
    expect(() => validateServerEnv({ APP_ENV: "prod" })).toThrow(/PUBLIC_BASE_URL: obrigatória em prod/)
    expect(() => validateServerEnv({ APP_ENV: "prod", PUBLIC_BASE_URL: "http://localhost:3000" })).toThrow(ServerEnvError)
    expect(() => validateServerEnv({ APP_ENV: "prod", PUBLIC_BASE_URL: "http://levelusp.usp.br" })).toThrow(/https/)
  })

  it("recusa URL interna malformada e origem com caminho", () => {
    expect(() => validateServerEnv({ API_INTERNAL_URL: "api:4000" })).toThrow(/API_INTERNAL_URL/)
    expect(() => validateServerEnv({ PUBLIC_BASE_URL: "https://usp.br/levelusp" })).toThrow(/só a origem/)
  })
})
