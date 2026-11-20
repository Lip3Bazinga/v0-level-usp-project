import { describe, expect, it } from "vitest"
import { BROWSER_PYTHON_VERSION } from "@/lib/python/runtime-config"
import { formatPipList, helpText, parseShellCommand, replBanner, splitShellWords } from "./shell"

/** Mensagem de erro da linha, ou "" se ela for um comando válido. */
function errorOf(line: string): string {
  const command = parseShellCommand(line)
  return command.kind === "error" ? command.message : ""
}

describe("splitShellWords", () => {
  it("separa por espaços e respeita aspas", () => {
    expect(splitShellWords("cat 'meu arquivo.txt'  \"outro arquivo.py\" x")).toEqual(["cat", "meu arquivo.txt", "outro arquivo.py", "x"])
  })

  it("aceita argumento vazio entre aspas e linha só com espaços", () => {
    expect(splitShellWords("ls ''")).toEqual(["ls", ""])
    expect(splitShellWords("   ")).toEqual([])
  })

  it("devolve null com aspas sem fechar", () => {
    expect(splitShellWords("cat 'abc")).toBeNull()
  })
})

describe("parseShellCommand", () => {
  it("python com arquivo roda o arquivo; sem arquivo abre o REPL", () => {
    expect(parseShellCommand("python main.py")).toEqual({ kind: "python", script: "main.py" })
    expect(parseShellCommand("python3 dados/a.py")).toEqual({ kind: "python", script: "dados/a.py" })
    expect(parseShellCommand("python")).toEqual({ kind: "python", script: null })
  })

  it("explica opções e argumentos que o terminal não suporta", () => {
    expect(errorOf("python -c 'print(1)'")).toContain("-c")
    expect(errorOf("python a.py b")).toContain("argumentos extras")
    expect(parseShellCommand("python --version")).toEqual({ kind: "python-version" })
  })

  it("reconhece ls, cat, clear, help e linha vazia", () => {
    expect(parseShellCommand("ls")).toEqual({ kind: "ls", args: [] })
    expect(parseShellCommand("ls -la dados")).toEqual({ kind: "ls", args: ["-la", "dados"] })
    expect(parseShellCommand("cat a.py b.py")).toEqual({ kind: "cat", args: ["a.py", "b.py"] })
    expect(parseShellCommand("clear")).toEqual({ kind: "clear" })
    expect(parseShellCommand("help")).toEqual({ kind: "help" })
    expect(parseShellCommand("   ")).toEqual({ kind: "empty" })
  })

  it("pip list mostra o manifesto; pip install é recusado com explicação", () => {
    expect(parseShellCommand("pip list")).toEqual({ kind: "pip-list" })
    expect(errorOf("pip install requests")).toContain("vêm da lição")
    expect(errorOf("pip")).toContain("pip list")
  })

  it("comando desconhecido aponta o help", () => {
    expect(parseShellCommand("rm -rf /")).toEqual({ kind: "error", message: "rm: comando não encontrado. Digite help para ver os comandos." })
  })

  it("aspas sem fechar viram erro de sintaxe", () => {
    expect(errorOf("cat 'x")).toContain("aspas")
  })
})

describe("textos do terminal", () => {
  it("help lista todos os comandos pedidos", () => {
    const help = helpText()
    for (const command of ["python arquivo.py", "python ", "ls", "cat", "pip list", "clear", "help", "Ctrl+C"]) expect(help).toContain(command)
  })

  it("o banner do REPL mostra a versão do Python do navegador", () => {
    expect(replBanner()).toContain(`Python ${BROWSER_PYTHON_VERSION}`)
  })

  it("pip list alinha as colunas como o pip", () => {
    expect(
      formatPipList([
        { name: "numpy", version: "2.4.6" },
        { name: "matplotlib", version: "3.10.8" },
      ]),
    ).toBe(["Package    Version", "---------- -------", "matplotlib 3.10.8", "numpy      2.4.6"].join("\n"))
  })
})
