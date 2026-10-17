import { describe, expect, it } from "vitest"
import { CODE_ALPHABET, formatIssuedDate, formatScore, generateVerificationCode, normalizeCode, verificationUrl } from "./certificates.domain"

describe("generateVerificationCode", () => {
  it("segue o formato LVL-XXXX-XXXX com alfabeto sem ambiguidade", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateVerificationCode()
      expect(code).toMatch(/^LVL-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      expect(code.slice(4).replace("-", "")).not.toMatch(/[01OIL]/)
    }
  })
  it("usa o gerador injetado", () => {
    expect(generateVerificationCode(() => 0)).toBe(`LVL-${CODE_ALPHABET[0]!.repeat(4)}-${CODE_ALPHABET[0]!.repeat(4)}`)
  })
  it("praticamente não repete", () => {
    const seen = new Set(Array.from({ length: 2000 }, () => generateVerificationCode()))
    expect(seen.size).toBe(2000)
  })
})

describe("normalizeCode", () => {
  it("normaliza caixa e espaços", () => {
    expect(normalizeCode("  lvl-abcd-2345 ")).toBe("LVL-ABCD-2345")
    expect(normalizeCode("LU-ABCDE-12345")).toBe("LU-ABCDE-12345")
  })
  it("recusa entradas implausíveis", () => {
    expect(normalizeCode("")).toBeNull()
    expect(normalizeCode("a'; drop table")).toBeNull()
    expect(normalizeCode("X".repeat(80))).toBeNull()
  })
})

describe("formatação", () => {
  it("nota em pt-BR", () => {
    expect(formatScore(87.5)).toBe("87,5%")
    expect(formatScore(100)).toBe("100%")
  })
  it("data no fuso de São Paulo", () => {
    expect(formatIssuedDate("2026-10-16T02:00:00Z")).toBe("15 de outubro de 2026")
  })
  it("URL de verificação", () => {
    expect(verificationUrl("https://levelusp.example/", "LVL-ABCD-2345")).toBe("https://levelusp.example/certificado/LVL-ABCD-2345")
  })
})
