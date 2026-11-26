import { describe, expect, it } from "vitest"
import { serverOnlyLibrariesNotice } from "./server-only-libraries"

describe("serverOnlyLibrariesNotice", () => {
  it("não avisa quando o navegador carrega todas as bibliotecas da lição", () => {
    expect(serverOnlyLibrariesNotice(null)).toBeNull()
    expect(serverOnlyLibrariesNotice([])).toBeNull()
    expect(serverOnlyLibrariesNotice(["numpy", "pandas", "sklearn"])).toBeNull()
  })

  it("avisa que o PyTorch só roda no Verificar (lição python-completo)", () => {
    const notice = serverOnlyLibrariesNotice(["numpy", "torch"])
    expect(notice).toContain("torch só existe na correção do servidor")
    expect(notice).toContain("Use Verificar")
    expect(notice).not.toContain("numpy")
  })

  it("lista todas as bibliotecas que o navegador não tem", () => {
    expect(serverOnlyLibrariesNotice(["torch", "xgboost"])).toContain("torch, xgboost só existem na correção do servidor")
  })
})
