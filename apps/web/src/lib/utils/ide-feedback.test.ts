import { describe, expect, it } from "vitest"
import { ApiError } from "@/lib/api/client"
import { pythonErrorLines, stderrLines, stdoutLines, verificationErrorLine } from "./ide-feedback"

describe("feedback do console da IDE", () => {
  it("separa o stdout em linhas e descarta as vazias", () => {
    expect(stdoutLines("a\n\nb\n")).toEqual([
      { type: "output", message: "a" },
      { type: "output", message: "b" },
    ])
  })

  it("mostra o stderr do programa como aviso, sem tratá-lo como erro", () => {
    expect(stderrLines("cuidado\n")).toEqual([{ type: "warning", message: "cuidado" }])
  })

  it("explica o erro do Python em três linhas: explicação, original e dica", () => {
    const lines = pythonErrorLines("NameError: name 'x' is not defined")
    expect(lines.map((line) => line.type)).toEqual(["error", "warning", "warning"])
    expect(lines[0]?.message).toContain("Variavel nao encontrada")
  })

  it("traduz falhas da verificação no servidor", () => {
    expect(verificationErrorLine(new TypeError("x")).message).toMatch(/Erro de conexão/)
    expect(verificationErrorLine(new ApiError(404, "NOT_FOUND", "x")).message).toBe("Lição não encontrada no servidor.")
    expect(verificationErrorLine(new ApiError(429, "RATE_LIMITED", "Calma!"))).toEqual({ type: "warning", message: "Calma!" })
    expect(verificationErrorLine(new ApiError(503, "RUNNER_BUSY", "Fila cheia, tente em 8 s."))).toEqual({ type: "warning", message: "Fila cheia, tente em 8 s." })
    expect(verificationErrorLine(new ApiError(500, "INTERNAL", "Falhou."))).toEqual({ type: "error", message: "Falhou." })
  })
})
