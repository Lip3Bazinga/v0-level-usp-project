import { describe, expect, it } from "vitest"
import {
  checkLibraries, findManifestLibrary, LIBRARY_MANIFEST, listManifestLibrariesFor, normalizeLibraryName, validateLibraryManifest, type LibraryManifestEntry,
} from "./index"

const NUMPY: LibraryManifestEntry = {
  name: "numpy", version: "2.4.6", aliases: [], display_name: "NumPy", description: "Arrays.", category: "data-science",
  browser: true, engines: ["python-dados"], pyodide_profile: "dados",
}
const TORCH: LibraryManifestEntry = { ...NUMPY, name: "torch", version: "2.9.0", display_name: "PyTorch", browser: false, engines: [], pyodide_profile: null }

describe("manifesto de bibliotecas", () => {
  it("o manifesto publicado é consistente", () => {
    expect(validateLibraryManifest(LIBRARY_MANIFEST)).toEqual([])
  })

  it("está em ordem alfabética (PRs de bibliotecas novas não brigam por posição)", () => {
    const names = LIBRARY_MANIFEST.map((entry) => entry.name)
    expect(names).toEqual([...names].sort())
  })

  it("normaliza o nome como o pyodide-lock (PEP 503)", () => {
    expect(normalizeLibraryName("  Scikit_Learn ")).toBe("scikit-learn")
    expect(normalizeLibraryName("ruamel.yaml")).toBe("ruamel-yaml")
  })

  it("acha por nome ou apelido, sem diferenciar maiúsculas", () => {
    expect(findManifestLibrary("NumPy")?.name).toBe("numpy")
    expect(findManifestLibrary("sklearn")?.name).toBe("scikit-learn")
    expect(findManifestLibrary("xgboost")).toBeUndefined()
  })

  it("lista só o que o motor oferece", () => {
    expect(listManifestLibrariesFor("python-dados").map((entry) => entry.name)).toContain("pandas")
    expect(listManifestLibrariesFor("python")).toEqual([])
  })

  it("separa biblioteca pendente (fora do manifesto) de biblioteca fora do motor da lição", () => {
    const manifest = [NUMPY, TORCH]
    expect(checkLibraries("python-dados", ["numpy", "Numpy"], manifest)).toEqual({ pending: [], unavailable: [] })
    expect(checkLibraries("python-dados", ["numpy", "xgboost", "torch"], manifest)).toEqual({ pending: ["xgboost"], unavailable: ["torch"] })
    expect(checkLibraries("python", ["numpy"], manifest)).toEqual({ pending: [], unavailable: ["numpy"] })
  })

  it("recusa entrada malformada, nome repetido e perfil incoerente", () => {
    expect(validateLibraryManifest([{ ...NUMPY, version: "?" }]).join()).toContain("version")
    expect(validateLibraryManifest([NUMPY, { ...NUMPY }]).join()).toContain("já pertence")
    expect(validateLibraryManifest([{ ...NUMPY, pyodide_profile: null }]).join()).toContain("exige pyodide_profile")
    expect(validateLibraryManifest([{ ...TORCH, pyodide_profile: "ml" }]).join()).toContain("sem o motor python-dados")
    expect(validateLibraryManifest([{ ...NUMPY, browser: false }]).join()).toContain("browser: true")
    expect(validateLibraryManifest([{ ...NUMPY, aliases: ["numpy"] }]).join()).toContain("apelido igual ao nome")
    expect(validateLibraryManifest([{ ...NUMPY, extra: 1 }]).join()).toContain("entrada 1")
  })
})
