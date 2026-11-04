import { describe, expect, it } from "vitest"
import { isLocalHostname, parsePublicOrigin, productionOriginProblem } from "./public-url"

describe("public-url", () => {
  it("reconhece hosts locais", () => {
    expect(isLocalHostname("localhost")).toBe(true)
    expect(isLocalHostname("app.localhost")).toBe(true)
    expect(isLocalHostname("127.0.0.1")).toBe(true)
    expect(isLocalHostname("levelusp.usp.br")).toBe(false)
  })

  it("normaliza para a origem e explica o problema em produção", () => {
    expect(parsePublicOrigin("https://LevelUSP.usp.br:443/")).toEqual({ ok: true, origin: "https://levelusp.usp.br" })
    expect(parsePublicOrigin("https://usuario:senha@levelusp.usp.br").ok).toBe(false)
    expect(parsePublicOrigin("https://usp.br/levelusp").ok).toBe(false)
    expect(productionOriginProblem("https://levelusp.usp.br")).toBeNull()
    expect(productionOriginProblem("http://levelusp.usp.br")).toMatch(/https/)
    expect(productionOriginProblem("https://127.0.0.1")).toMatch(/127.0.0.1/)
  })
})
