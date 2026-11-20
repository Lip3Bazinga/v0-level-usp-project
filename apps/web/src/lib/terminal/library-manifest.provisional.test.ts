// @vitest-environment node
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { listBrowserLibraries } from "./library-manifest.provisional"

const lockPath = path.join(path.dirname(createRequire(import.meta.url).resolve("pyodide/package.json")), "pyodide-lock.json")
const lock = z.object({ packages: z.record(z.string(), z.object({ version: z.string() })) }).parse(JSON.parse(readFileSync(lockPath, "utf8")))

describe("lista provisória de bibliotecas do navegador", () => {
  it("só tem pacotes que existem no pyodide-lock.json, na mesma versão", () => {
    for (const library of listBrowserLibraries()) {
      expect(lock.packages[library.name]?.version, library.name).toBe(library.version)
    }
  })

  it("está em ordem alfabética e sem repetição", () => {
    const names = listBrowserLibraries().map((library) => library.name)
    expect(names).toEqual([...new Set(names)].sort())
  })
})
