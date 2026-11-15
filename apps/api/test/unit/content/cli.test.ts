import path from "node:path"
import { describe, expect, it } from "vitest"
import { parseContentArgs } from "../../../scripts/content/cli"

const REPO_ROOT = "/repo"
const ENV = { INIT_CWD: "/repo/apps/api" }

describe("parseContentArgs", () => {
  it("usa os padrões relativos à raiz do repositório", () => {
    expect(parseContentArgs([], REPO_ROOT, ENV)).toEqual({
      contentDir: path.resolve(REPO_ROOT, "content"),
      displayRoot: "/repo/apps/api",
      out: path.resolve(REPO_ROOT, "packages/db/seed/trilha-python-ia.json"),
      course: undefined,
      lesson: undefined,
    })
  })

  it("resolve caminhos relativos a partir de onde o pnpm foi chamado e lê os filtros", () => {
    const options = parseContentArgs(["--content", "content/exemplo", "--out", "/tmp/x.json", "--curso", "n1", "--licao", "n1-m1-01"], REPO_ROOT, { INIT_CWD: "/repo" })
    // `path.resolve` no esperado: no Windows o resultado ganha a letra da unidade.
    expect(options).toEqual({ contentDir: path.resolve("/repo", "content/exemplo"), displayRoot: "/repo", out: path.resolve("/tmp/x.json"), course: "n1", lesson: "n1-m1-01" })
  })

  it("sem INIT_CWD cai no diretório atual", () => {
    expect(parseContentArgs(["--content", "pasta"], REPO_ROOT, {}).contentDir).toBe(path.resolve(process.cwd(), "pasta"))
  })

  it("recusa opção desconhecida", () => {
    expect(() => parseContentArgs(["--saida", "x"], REPO_ROOT, ENV)).toThrow()
  })
})
