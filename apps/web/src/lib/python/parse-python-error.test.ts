import { describe, expect, it } from "vitest"
import { parsePythonError } from "./parse-python-error"

/*
 * Tracebacks copiados do Pyodide 314.0.7 (Python 3.14.2) executando pelo
 * harness de project-execution.ts — o mesmo texto que o aluno vê no console.
 */
const TRACEBACKS_314 = {
  invalidSyntax: '  File "main.py", line 1\n    x = = 1\n        ^\nSyntaxError: invalid syntax\n',
  missingColon: '  File "main.py", line 1\n    if True\n           ^\nSyntaxError: expected \':\'\n',
  unterminatedString:
    "  File \"main.py\", line 1\n    print('abc\n          ^\nSyntaxError: unterminated string literal (detected at line 1)\n",
  unclosedParenthesis: "  File \"main.py\", line 1\n    print((1, 2)\n         ^\nSyntaxError: '(' was never closed\n",
  indentation:
    "  File \"main.py\", line 2\n    print(1)\n    ^^^^^\nIndentationError: expected an indented block after 'if' statement on line 1\n",
  nameWithSuggestion:
    "Traceback (most recent call last):\n  File \"main.py\", line 3, in <module>\n    f()\n    ~^^\n  File \"main.py\", line 2, in f\n    return pritn(1)\n           ^^^^^\nNameError: name 'pritn' is not defined. Did you mean: 'print'?\n",
  moduleNotFound:
    "Traceback (most recent call last):\n  File \"main.py\", line 1, in <module>\n    import numpyy\nModuleNotFoundError: No module named 'numpyy'\n",
  eof: "Traceback (most recent call last):\n  File \"main.py\", line 1, in <module>\n    nome = input()\nEOFError: EOF when reading a line\n",
  methodArguments:
    "Traceback (most recent call last):\n  File \"main.py\", line 4, in <module>\n    Pessoa('a', 2)\n    ~~~~~~^^^^^^^^\nTypeError: Pessoa.__init__() takes 2 positional arguments but 3 were given\n",
  zeroDivision:
    "Traceback (most recent call last):\n  File \"main.py\", line 1, in <module>\n    1/0\n    ~^~\nZeroDivisionError: division by zero\n",
  keyErrorQuotedInSource:
    "Traceback (most recent call last):\n  File \"main.py\", line 1, in <module>\n    print(1 / 0)  # ZeroDivisionError\nKeyError: 'b'\n",
} as const

describe("tradução de erros do Python 3.14", () => {
  it.each([
    ["invalidSyntax", "Erro de Sintaxe"],
    ["missingColon", "Faltou dois-pontos"],
    ["unterminatedString", "String nao fechada"],
    ["unclosedParenthesis", "Simbolo aberto e nao fechado"],
    ["indentation", "Erro de Indentacao"],
    ["moduleNotFound", "Modulo nao encontrado"],
    ["eof", "input() sem entrada"],
    ["methodArguments", "Numero errado de argumentos"],
    ["zeroDivision", "Divisao por zero"],
  ] as const)("reconhece %s", (key, title) => {
    expect(parsePythonError(TRACEBACKS_314[key]).title).toBe(title)
  })

  it("aproveita a sugestão 'Did you mean' do Python na dica", () => {
    const parsed = parsePythonError(TRACEBACKS_314.nameWithSuggestion)
    expect(parsed.title).toBe("Variavel nao encontrada")
    expect(parsed.hint).toContain("'print'")
  })

  it("explica que exit() não existe e sugere sys.exit()", () => {
    const parsed = parsePythonError("NameError: name 'exit' is not defined")
    expect(parsed.title).toBe("exit() nao disponivel")
    expect(parsed.hint).toContain("sys.exit()")
  })

  it("prefere o erro da última linha a um nome de erro citado no código", () => {
    expect(parsePythonError(TRACEBACKS_314.keyErrorQuotedInSource).title).toBe("Chave nao encontrada")
  })

  it("preserva o traceback original", () => {
    expect(parsePythonError(TRACEBACKS_314.zeroDivision).original).toBe(TRACEBACKS_314.zeroDivision)
  })
})
