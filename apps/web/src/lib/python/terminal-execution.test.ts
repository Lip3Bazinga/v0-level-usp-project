// @vitest-environment node
import { loadPyodide, type PyodideAPI } from "pyodide"
import { beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createTerminalRuntime, type TerminalBridge, type TerminalCommandResult, type TerminalRuntime } from "./terminal-execution"

/*
 * Terminal no Pyodide real (pacote npm): as duas estratégias de input() — suspensão de pilha
 * (JSPI) e reexecução — e o REPL. As telas e o worker são testados à parte, com mocks.
 */
const PYODIDE_LOAD_TIMEOUT_MS = 60_000

/*
 * A suspensão de pilha depende do JSPI do motor JavaScript (`WebAssembly.Suspending`): existe no
 * Node 24+ e falta no Node 22 do CI. Sem ele, os testes da suspensão são pulados e o runtime padrão
 * tem que cair na reexecução (teste próprio abaixo).
 */
const HAS_JSPI = "Suspending" in WebAssembly

const main = (content: string): { path: string; content: string } => ({ path: "main.py", content })

interface Recorder {
  bridge: TerminalBridge
  stdout: () => string
  stderr: () => string
  /** Quantas vezes o Python pediu uma linha. */
  requests: () => number
  answers: Array<string | null>
  reset: () => void
}

function createRecorder(): Recorder {
  let out = ""
  let err = ""
  let requested = 0
  const answers: Array<string | null> = []
  return {
    bridge: {
      write: (stream, text) => {
        if (stream === "stdout") out += text
        else err += text
      },
      requestInput: () => {
        requested += 1
        const answer = answers.shift()
        return Promise.resolve(answer === undefined || answer === null ? { eof: true, line: "" } : { eof: false, line: answer })
      },
    },
    stdout: () => out,
    stderr: () => err,
    requests: () => requested,
    answers,
    reset: () => {
      out = ""
      err = ""
      requested = 0
      answers.length = 0
    },
  }
}

let pyodide: PyodideAPI
const recorder = createRecorder()
let suspending: TerminalRuntime
let replaying: TerminalRuntime

beforeAll(async () => {
  pyodide = await loadPyodide()
  suspending = await createTerminalRuntime(pyodide, recorder.bridge)
  replaying = await createTerminalRuntime(pyodide, recorder.bridge, { allowStackSwitching: false })
}, PYODIDE_LOAD_TIMEOUT_MS)

beforeEach(() => recorder.reset())

describe("terminal Python: python arquivo.py", () => {
  it("roda o arquivo, mostra a saída e termina com status ok", async () => {
    const result = await replaying.runScript([main("print('olá', 1 + 1)")], "main.py")
    expect(result).toEqual({ status: "ok", figures: [] })
    expect(recorder.stdout()).toBe("olá 2\n")
  })

  it("separa stdout de stderr e mostra o traceback só com quadros do aluno", async () => {
    const result = await replaying.runScript([main("print('antes')\ndef f():\n    return 1 / 0\nf()")], "main.py")
    expect(result.status).toBe("error")
    expect(recorder.stdout()).toBe("antes\n")
    expect(recorder.stderr()).toContain('File "main.py", line 4')
    expect(recorder.stderr()).toContain("ZeroDivisionError: division by zero")
    expect(recorder.stderr()).not.toContain("_exec_script")
  })

  it("enxerga outros arquivos da lição e a edição deles na execução seguinte", async () => {
    const run = (valor: number): Promise<TerminalCommandResult> => replaying.runScript([main("import util\nprint(util.valor())"), { path: "util.py", content: `def valor():\n    return ${valor}` }], "main.py")
    await run(1)
    await run(2)
    expect(recorder.stdout()).toBe("1\n2\n")
  })

  it("avisa quando o arquivo não existe", async () => {
    const result = await replaying.runScript([main("print(1)")], "nada.py")
    expect(result.status).toBe("error")
    expect(recorder.stderr()).toBe("python: não foi possível abrir o arquivo 'nada.py': arquivo inexistente\n")
  })

  it("não deixa o programa sair da pasta do projeto pelo nome do arquivo", async () => {
    const result = await replaying.runScript([main("print(1)")], "../etc/passwd")
    expect(result.status).toBe("error")
    expect(recorder.stderr()).toContain("arquivo inexistente")
  })

  it("trata sys.exit com código como erro e sys.exit(0) como sucesso", async () => {
    expect((await replaying.runScript([main("import sys\nsys.exit(0)")], "main.py")).status).toBe("ok")
    expect((await replaying.runScript([main("import sys\nsys.exit('falhou')")], "main.py")).status).toBe("error")
    expect(recorder.stderr()).toBe("falhou\n")
  })

  it("corta a saída no limite e avisa", async () => {
    await replaying.runScript([main("print('x' * 70000)")], "main.py")
    expect(recorder.stdout().length).toBe(64_000)
    expect(recorder.stderr()).toContain("[saída cortada em 64000 caracteres]")
  })
})

describe("terminal Python: input()", () => {
  const program = "nome = input('Nome: ')\nidade = int(input('Idade: '))\nprint(f'{nome} tem {idade}')"

  it.skipIf(!HAS_JSPI)("suspensão de pilha: espera cada linha sem refazer o programa", async () => {
    expect(suspending.canSuspendForInput).toBe(true)
    recorder.answers.push("Ana", "20")
    const result = await suspending.runScript([main(program)], "main.py")
    expect(result.status).toBe("ok")
    expect(recorder.stdout()).toBe("Nome: Idade: Ana tem 20\n")
    expect(recorder.requests()).toBe(2)
  })

  it.skipIf(HAS_JSPI)("sem JSPI, o runtime padrão cai na reexecução", async () => {
    expect(suspending.canSuspendForInput).toBe(false)
    recorder.answers.push("Ana", "20")
    const result = await suspending.runScript([main(program)], "main.py")
    expect(result.status).toBe("ok")
    expect(recorder.stdout()).toBe("Nome: Idade: Ana tem 20\n")
    expect(recorder.requests()).toBe(2)
  })

  it("reexecução: pede cada linha e não repete a saída já mostrada", async () => {
    expect(replaying.canSuspendForInput).toBe(false)
    recorder.answers.push("Ana", "20")
    const result = await replaying.runScript([main(program)], "main.py")
    expect(result.status).toBe("ok")
    expect(recorder.stdout()).toBe("Nome: Idade: Ana tem 20\n")
    expect(recorder.requests()).toBe(2)
  })

  it.each([
    ["suspensão", () => suspending],
    ["reexecução", () => replaying],
  ])("%s: fim de entrada vira EOFError", async (_name, runtime) => {
    const result = await runtime().runScript([main("input('x')")], "main.py")
    expect(result.status).toBe("error")
    expect(recorder.stderr()).toContain("EOFError: EOF when reading a line")
  })

  it("lê sys.stdin.readline e itera sobre as linhas até o fim da entrada", async () => {
    recorder.answers.push("a", "b", null)
    await suspending.runScript([main("import sys\nprint(sys.stdin.readline().strip())\nfor linha in sys.stdin:\n    print('>', linha.strip())")], "main.py")
    expect(recorder.stdout()).toBe("a\n> b\n")
  })

  it("reexecução repete o mesmo sorteio (semente fixa por comando)", async () => {
    recorder.answers.push("ok")
    await replaying.runScript([main("import random\nprint(random.randint(1, 10**9))\ninput()\nprint('fim')")], "main.py")
    const lines = recorder.stdout().trim().split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe("fim")
  })
})

describe("terminal Python: ls e cat", () => {
  const files = [main("print(1)"), { path: "dados/notas.txt", content: "7\n9\n" }]

  it("lista a pasta do projeto, com / nas pastas", async () => {
    await replaying.runFs("ls", [], files)
    expect(recorder.stdout()).toBe("dados/\nmain.py\n")
  })

  it("mostra arquivos criados pelo programa e remove os que saíram da lição", async () => {
    await replaying.runScript([main("open('saida.txt', 'w').write('oi')")], "main.py")
    recorder.reset()
    await replaying.runFs("ls", [], [main("x = 1")])
    expect(recorder.stdout()).toBe("main.py\nsaida.txt\n")
  })

  it("imprime o conteúdo e avisa de arquivo inexistente ou pasta", async () => {
    const result = await replaying.runFs("cat", ["dados/notas.txt", "nada.txt", "dados"], files)
    expect(result.status).toBe("error")
    expect(recorder.stdout()).toBe("7\n9\n")
    expect(recorder.stderr()).toBe("cat: nada.txt: arquivo ou diretório inexistente\ncat: dados: é um diretório\n")
  })

  it("não lê fora da pasta do projeto", async () => {
    await replaying.runFs("cat", ["../etc/passwd"], files)
    expect(recorder.stdout()).toBe("")
    expect(recorder.stderr()).toContain("inexistente")
  })
})

describe("terminal Python: REPL", () => {
  it("guarda variáveis entre as linhas e mostra o valor das expressões", async () => {
    await replaying.startRepl([main("")])
    await replaying.pushRepl("x = 20")
    await replaying.pushRepl("x * 2")
    expect(recorder.stdout()).toBe("40\n")
  })

  it("pede continuação em blocos e executa ao fechar o bloco", async () => {
    await replaying.startRepl([main("")])
    expect((await replaying.pushRepl("for i in range(2):")).status).toBe("more")
    expect((await replaying.pushRepl("    print(i)")).status).toBe("more")
    expect((await replaying.pushRepl("")).status).toBe("ok")
    expect(recorder.stdout()).toBe("0\n1\n")
  })

  it("descarta o bloco incompleto com null (Ctrl+C)", async () => {
    await replaying.startRepl([main("")])
    await replaying.pushRepl("if True:")
    await replaying.pushRepl(null)
    await replaying.pushRepl("print('ok')")
    expect(recorder.stdout()).toBe("ok\n")
  })

  it("mostra o erro no formato do REPL e continua vivo", async () => {
    await replaying.startRepl([main("")])
    const result = await replaying.pushRepl("1 / 0")
    expect(result.status).toBe("ok")
    expect(recorder.stderr()).toContain('File "<stdin>", line 1, in <module>')
    expect(recorder.stderr()).toContain("ZeroDivisionError")
    await replaying.pushRepl("print('vivo')")
    expect(recorder.stdout()).toBe("vivo\n")
  })

  it("importa os arquivos da lição", async () => {
    await replaying.startRepl([main(""), { path: "util.py", content: "NOME = 'util'" }])
    await replaying.pushRepl("import util")
    await replaying.pushRepl("util.NOME")
    expect(recorder.stdout()).toBe("'util'\n")
  })

  it.skipIf(!HAS_JSPI)("input() espera a linha quando há suspensão de pilha", async () => {
    await suspending.startRepl([main("")])
    recorder.answers.push("Bia")
    await suspending.pushRepl("nome = input('? ')")
    await suspending.pushRepl("nome")
    expect(recorder.stdout()).toBe("? 'Bia'\n")
  })

  it("input() sem suspensão de pilha explica o que fazer", async () => {
    await replaying.startRepl([main("")])
    await replaying.pushRepl("input()")
    expect(recorder.stderr()).toContain("RuntimeError: input() no REPL exige")
  })

  it("exit via SystemExit encerra o REPL", async () => {
    await replaying.startRepl([main("")])
    expect((await replaying.pushRepl("raise SystemExit")).status).toBe("exit")
  })
})
