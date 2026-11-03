// @vitest-environment node
import { loadPyodide } from "pyodide"
import { beforeAll, describe, expect, it } from "vitest"
import { BROWSER_PYTHON_VERSION } from "./runtime-config"
import { createProjectRunner, readPythonVersion, type ProjectRunner, type ProjectRunResult } from "./project-execution"

/*
 * Roda o harness do "Executar" no Pyodide real (pacote npm). A paridade com o
 * executor do servidor é coberta por `pnpm test:paridade`; aqui ficam os
 * comportamentos que só existem no navegador (reexecuções no mesmo runtime).
 */
const PYODIDE_LOAD_TIMEOUT_MS = 60_000

let runProject: ProjectRunner
let pythonVersion: string

beforeAll(async () => {
  const pyodide = await loadPyodide()
  runProject = createProjectRunner(pyodide)
  pythonVersion = readPythonVersion(pyodide)
}, PYODIDE_LOAD_TIMEOUT_MS)

const main = (content: string): { path: string; content: string } => ({ path: "main.py", content })

describe("execução de projetos no Pyodide", () => {
  it("usa o Python declarado no manifesto do runtime", () => {
    expect(pythonVersion).toBe(BROWSER_PYTHON_VERSION)
  })

  it("roda o arquivo de entrada como __main__ e captura stdout", () => {
    const result = runProject({ files: [main("if __name__ == '__main__':\n    print('oi')")], entryPath: "main.py" })
    expect(result).toMatchObject({ stdout: "oi\n", stderr: "", error: null })
  })

  it("enxerga a edição de um módulo do projeto na execução seguinte", () => {
    const run = (body: string): ProjectRunResult =>
      runProject({ files: [main("import utils\nprint(utils.valor())"), { path: "utils.py", content: body }], entryPath: "main.py" })
    expect(run("def valor():\n    return 1").stdout).toBe("1\n")
    expect(run("def valor():\n    return 2").stdout).toBe("2\n")
  })

  it("não deixa arquivos de uma execução vazarem para a próxima", () => {
    runProject({ files: [main("open('lixo.txt', 'w').write('x')")], entryPath: "main.py" })
    const result = runProject({ files: [main("import os\nprint(sorted(os.listdir('.')))")], entryPath: "main.py" })
    expect(result.stdout).toBe("['main.py']\n")
  })

  it("devolve o tipo, o resumo e o traceback só com quadros do aluno", () => {
    const { error } = runProject({ files: [main("def f():\n    return 1 / 0\nf()")], entryPath: "main.py" })
    expect(error?.type).toBe("ZeroDivisionError")
    expect(error?.summary).toBe("ZeroDivisionError: division by zero")
    expect(error?.traceback).toMatch(/^Traceback[\s\S]*File "main.py", line 2, in f[\s\S]*ZeroDivisionError: division by zero\n$/)
    expect(error?.traceback).not.toContain("<exec>")
  })

  it("não tem exit(), como o executor do servidor (python -S)", () => {
    const { error } = runProject({ files: [main("exit()")], entryPath: "main.py" })
    expect(error?.summary).toBe("NameError: name 'exit' is not defined")
  })

  it("trata SystemExit(0) como sucesso e lê input() da entrada dada", () => {
    const result = runProject({
      files: [main("import sys\nprint(input())\nsys.exit(0)")],
      entryPath: "main.py",
      stdin: "Ana\n",
    })
    expect(result).toMatchObject({ stdout: "Ana\n", error: null })
  })
})
