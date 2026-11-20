import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { LIBRARY_MANIFEST, listManifestLibrariesFor } from "@levelusp/contracts"
import { PYODIDE_KNOWN_LIBRARIES, PYODIDE_PROFILES, resolveProfile } from "../src/pyodide-profiles"

/**
 * O manifesto de bibliotecas (`packages/contracts/src/library-manifest.ts`) é a fonte única; aqui o CI confere que
 * o que o executor realmente instala e aceita não saiu dele: o `pyodide-lock.json` da dependência `pyodide`
 * (pacotes e versões), o `PACKAGES` da imagem (`fetch-pyodide.sh`) e os perfis de worker do motor Pyodide.
 * Biblioteca nova: acrescente a entrada no manifesto e ajuste os dois lugares apontados nas mensagens.
 */

const testDir = path.dirname(fileURLToPath(import.meta.url))
const runnerDir = path.resolve(testDir, "..")
const repoRoot = path.resolve(runnerDir, "../..")
const pyodideDir = path.dirname(createRequire(import.meta.url).resolve("pyodide/package.json"))

interface PyodideLock {
  packages: Record<string, { version: string }>
}
const lockPath = path.join(pyodideDir, "pyodide-lock.json")
const lock = JSON.parse(readFileSync(lockPath, "utf8")) as PyodideLock

const pyodideEntries = listManifestLibrariesFor("python-dados")
const names = (entries: readonly { name: string }[]): string[] => entries.map((entry) => entry.name).sort()

describe("manifesto de bibliotecas × executor", () => {
  it("cada pacote do navegador existe no pyodide-lock.json, na versão do manifesto", () => {
    const wrong = LIBRARY_MANIFEST.filter((entry) => entry.browser).flatMap((entry) => {
      const locked = lock.packages[entry.name]
      if (!locked) return [`${entry.name}: não existe no pyodide-lock.json`]
      return locked.version === entry.version ? [] : [`${entry.name}: manifesto ${entry.version}, lock ${locked.version}`]
    })
    expect(wrong).toEqual([])
  })

  it("o PACKAGES de fetch-pyodide.sh instala exatamente o manifesto (mais o micropip)", () => {
    const script = readFileSync(path.join(runnerDir, "scripts/fetch-pyodide.sh"), "utf8")
    const match = /PYODIDE_PACKAGES:-([^}"]+)\}/.exec(script)
    expect(match, "PACKAGES não encontrado em fetch-pyodide.sh").not.toBeNull()
    const installed = (match?.[1] ?? "").trim().split(/\s+/).filter((name) => name !== "micropip").sort()
    expect(installed).toEqual(names(pyodideEntries))
  })

  it("o motor Pyodide aceita as bibliotecas do manifesto (nomes e apelidos) e só elas", () => {
    const accepted = pyodideEntries.flatMap((entry) => [entry.name, ...entry.aliases]).sort()
    expect([...PYODIDE_KNOWN_LIBRARIES].sort()).toEqual(accepted)
  })

  it("o perfil mínimo de cada biblioteca é o do manifesto", () => {
    const wrong = pyodideEntries.filter((entry) => resolveProfile([entry.name, ...entry.aliases]) !== entry.pyodide_profile).map((entry) => entry.name)
    expect(wrong).toEqual([])
  })

  it("os perfis de worker carregam as bibliotecas do manifesto (ml contém dados)", () => {
    expect([...PYODIDE_PROFILES.dados.packages].sort()).toEqual(names(pyodideEntries.filter((entry) => entry.pyodide_profile === "dados")))
    expect([...PYODIDE_PROFILES.ml.packages].sort()).toEqual(names(pyodideEntries))
  })

  it("o executor e o navegador usam a mesma distribuição do Pyodide", () => {
    const web = JSON.parse(readFileSync(path.join(repoRoot, "apps/web/src/lib/python/pyodide-runtime.json"), "utf8")) as { version: string; files: Record<string, string> }
    const installed = JSON.parse(readFileSync(path.join(pyodideDir, "package.json"), "utf8")) as { version: string }
    expect(installed.version).toBe(web.version)
    const lockHash = createHash("sha256").update(readFileSync(lockPath)).digest("hex")
    expect(lockHash).toBe(web.files["pyodide-lock.json"])
  })
})
