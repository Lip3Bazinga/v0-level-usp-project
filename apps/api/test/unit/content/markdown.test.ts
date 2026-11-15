import { describe, expect, it } from "vitest"
import { fenceContent, MarkdownSyntaxError, parseFenceInfo, parseNumberedList, parseQuestion, rawText, scanMarkdown, toSourceLines } from "../../../scripts/content/markdown"

const scan = (text: string): ReturnType<typeof scanMarkdown> => scanMarkdown(toSourceLines(text))

describe("parseFenceInfo", () => {
  it("lê a linguagem e os atributos path= e name= (com ou sem aspas)", () => {
    expect(parseFenceInfo("python", 1)).toEqual({ language: "python", attributes: {} })
    expect(parseFenceInfo("python path=utils.py", 1)).toEqual({ language: "python", attributes: { path: "utils.py" } })
    expect(parseFenceInfo('python name="sem aspas" path=main.py', 1)).toEqual({ language: "python", attributes: { name: "sem aspas", path: "main.py" } })
    expect(parseFenceInfo("text path=dados.csv", 1)).toEqual({ language: "text", attributes: { path: "dados.csv" } })
  })

  it("aceita a palavra solta visualizar (e só ela) como marca do bloco", () => {
    expect(parseFenceInfo("python visualizar", 1)).toEqual({ language: "python", attributes: { visualizar: "true" } })
    expect(() => parseFenceInfo("python executar", 1)).toThrow(MarkdownSyntaxError)
  })

  it("recusa atributo que não é chave=valor, apontando a linha", () => {
    expect(() => parseFenceInfo("python sem-valor", 7)).toThrow(MarkdownSyntaxError)
    try {
      parseFenceInfo("python sem-valor", 7)
    } catch (error) {
      expect(error).toBeInstanceOf(MarkdownSyntaxError)
      if (error instanceof MarkdownSyntaxError) expect(error.line).toBe(7)
    }
  })
})

describe("scanMarkdown", () => {
  it("separa texto de blocos de código e ignora títulos dentro do bloco", () => {
    const nodes = scan("texto\n```python\n## não é passo\nprint(1)\n```\ndepois")
    expect(nodes.map((node) => node.kind)).toEqual(["text", "fence", "text"])
    const [, fence] = nodes
    expect(fence?.kind === "fence" && fence.body).toEqual(["## não é passo", "print(1)"])
    expect(fence?.kind === "fence" && fence.closed).toBe(true)
    expect(fence?.kind === "fence" && fenceContent(fence)).toBe("## não é passo\nprint(1)\n")
  })

  it("marca bloco sem fechamento e aceita cercas mais longas", () => {
    const [open] = scan("````python\n```\nainda dentro\n````")
    expect(open?.kind === "fence" && open.closed).toBe(true)
    expect(open?.kind === "fence" && open.body).toEqual(["```", "ainda dentro"])
    const [unclosed] = scan("```python\nprint(1)")
    expect(unclosed?.kind === "fence" && unclosed.closed).toBe(false)
  })

  it("reconstrói a narrativa sem linhas em branco nas pontas", () => {
    expect(rawText(scan("\n\nOlá\n\n```python\nx = 1\n```\n\n"))).toBe("Olá\n\n```python\nx = 1\n```")
  })
})

describe("parseNumberedList", () => {
  it("lê itens em sequência, continuação e a sublinha Dica:", () => {
    const items = parseNumberedList(scan("1. Primeiro item\n   continua aqui\n   Dica: use aspas\n\n2. Segundo"), "### Instruções")
    expect(items).toEqual([
      { line: 1, number: 1, text: "Primeiro item continua aqui", hint: "use aspas" },
      { line: 5, number: 2, text: "Segundo", hint: null },
    ])
  })

  it("exige numeração a partir de 1 e em ordem", () => {
    expect(() => parseNumberedList(scan("2. Primeiro"), "### Dicas")).toThrow(/item numerado 2 em ### Dicas; esperado 1/)
    expect(() => parseNumberedList(scan("1. A\n3. B"), "### Dicas")).toThrow(/esperado 2/)
  })

  it("recusa texto fora de item e blocos de código", () => {
    expect(() => parseNumberedList(scan("texto solto\n1. A"), "### Instruções")).toThrow(/texto fora de item numerado/)
    expect(() => parseNumberedList(scan("1. A\n```python\nx\n```"), "### Instruções")).toThrow(/não blocos de código/)
  })
})

describe("parseQuestion", () => {
  it("separa enunciado, alternativas marcadas e explicação", () => {
    const question = parseQuestion(scan("Qual função exibe texto?\n\n- [ ] `show()`\n- [x] `print()`\n* [ ] `echo()`\n> `print()` escreve\n> na saída."))
    expect(question.prompt).toBe("Qual função exibe texto?")
    expect(question.options.map((option) => [option.text, option.checked])).toEqual([["`show()`", false], ["`print()`", true], ["`echo()`", false]])
    expect(question.explanation).toBe("`print()` escreve na saída.")
  })

  it("aceita bloco de código no enunciado e recusa texto solto depois das alternativas", () => {
    const question = parseQuestion(scan("O que imprime?\n```python\nprint(2 * 3)\n```\n- [x] 6\n- [ ] 23"))
    expect(question.prompt).toBe("O que imprime?\n```python\nprint(2 * 3)\n```")
    expect(() => parseQuestion(scan("Enunciado\n- [x] a\n- [ ] b\ntexto solto"))).toThrow(/só cabe a explicação/)
  })
})
