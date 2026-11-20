import { describe, expect, it } from "vitest"
import { LineEditor, tokenizeInput, type EditorEvent } from "./line-editor"

interface Harness {
  editor: LineEditor
  screen: () => string
  /** Digita e devolve os eventos gerados. */
  type: (data: string) => EditorEvent[]
}

function createHarness(prompt = "$ ", keepHistory = true): Harness {
  let screen = ""
  const editor = new LineEditor((text) => {
    screen += text
  }, keepHistory)
  editor.begin(prompt)
  return {
    editor,
    screen: () => screen,
    type: (data) => tokenizeInput(data).flatMap((token) => editor.apply(token) ?? []),
  }
}

describe("tokenizeInput", () => {
  it("agrupa texto e separa teclas", () => {
    expect(tokenizeInput("ab\x1b[Dc\r")).toEqual([
      { type: "text", value: "ab" },
      { type: "key", key: "left" },
      { type: "text", value: "c" },
      { type: "key", key: "enter" },
    ])
  })

  it("conta \\r\\n como um Enter só e troca Tab por espaços", () => {
    expect(tokenizeInput("a\r\nb\tc")).toEqual([
      { type: "text", value: "a" },
      { type: "key", key: "enter" },
      { type: "text", value: "b    c" },
    ])
  })

  it("ignora sequências de escape desconhecidas sem imprimir lixo", () => {
    expect(tokenizeInput("a\x1b[15~b")).toEqual([
      { type: "text", value: "a" },
      { type: "text", value: "b" },
    ])
  })

  it("entende Ctrl+C, Ctrl+D e Ctrl+L", () => {
    expect(tokenizeInput("\x03\x04\x0c")).toEqual([
      { type: "key", key: "interrupt" },
      { type: "key", key: "eof" },
      { type: "key", key: "clear" },
    ])
  })

  it("mantém acentos e emojis colados", () => {
    expect(tokenizeInput("olá 😀")).toEqual([{ type: "text", value: "olá 😀" }])
  })
})

describe("LineEditor", () => {
  it("mostra o prompt e ecoa o que é digitado", () => {
    const { type, screen } = createHarness()
    type("ls")
    expect(screen()).toBe("$ ls")
  })

  it("Enter devolve a linha e vai para a linha de baixo", () => {
    const { type, screen } = createHarness()
    expect(type("ls\r")).toEqual([{ type: "submit", line: "ls" }])
    expect(screen()).toBe("$ ls\r\n")
  })

  it("Backspace no fim apaga um caractere na tela", () => {
    const { type, screen, editor } = createHarness()
    type("ab\x7f")
    expect(screen()).toBe("$ ab\b \b")
    expect(editor.text).toBe("a")
  })

  it("edita no meio da linha: setas, inserção e Delete redesenham", () => {
    const { type, editor, screen } = createHarness()
    type("ac\x1b[Db")
    expect(editor.text).toBe("abc")
    expect(screen().endsWith("\r\x1b[K$ abc\x1b[1D")).toBe(true)
    type("\x1b[3~")
    expect(editor.text).toBe("ab")
  })

  it("Home, End, Ctrl+U, Ctrl+K e Ctrl+W", () => {
    const { type, editor } = createHarness()
    type("um dois tres")
    type("\x17")
    expect(editor.text).toBe("um dois ")
    type("\x1b[H\x0b")
    expect(editor.text).toBe("")
    type("abc\x1b[D\x15")
    expect(editor.text).toBe("c")
  })

  it("setas para cima e para baixo percorrem o histórico e preservam o rascunho", () => {
    const { type, editor } = createHarness()
    type("primeiro\r")
    type("segundo\r")
    type("rascunho")
    type("\x1b[A")
    expect(editor.text).toBe("segundo")
    type("\x1b[A")
    expect(editor.text).toBe("primeiro")
    type("\x1b[A")
    expect(editor.text).toBe("primeiro")
    type("\x1b[B\x1b[B")
    expect(editor.text).toBe("rascunho")
  })

  it("não repete comando igual em sequência nem guarda linha vazia", () => {
    const { type, editor } = createHarness()
    type("ls\r")
    type("ls\r")
    type("\r")
    type("\x1b[A\x1b[A")
    expect(editor.text).toBe("ls")
  })

  it("sem histórico (resposta de input), as setas não fazem nada", () => {
    const { type, editor } = createHarness("", false)
    type("a\r")
    type("\x1b[A")
    expect(editor.text).toBe("")
  })

  it("Ctrl+D com linha vazia pede fim de entrada; com texto, apaga à frente", () => {
    const { type, editor } = createHarness()
    expect(type("\x04")).toEqual([{ type: "eof" }])
    type("ab\x1b[D\x04")
    expect(editor.text).toBe("a")
  })

  it("Ctrl+C descarta a linha e mostra ^C", () => {
    const { type, editor, screen } = createHarness()
    type("abc")
    editor.cancel()
    expect(editor.text).toBe("")
    expect(screen().endsWith("^C\r\n")).toBe(true)
    expect(type("\x03")).toEqual([{ type: "interrupt" }])
  })

  it("com begin(prompt, false) não repete o prompt que já está na tela", () => {
    let screen = ""
    const editor = new LineEditor((text) => {
      screen += text
    }, false)
    editor.begin("Nome: ", false)
    for (const token of tokenizeInput("Ana\x1b[Dx")) editor.apply(token)
    expect(screen).toBe("Ana\x1b[D\r\x1b[KNome: Anxa\x1b[1D")
  })

  it("limita o tamanho da linha", () => {
    const { type, editor } = createHarness()
    type("x".repeat(5000))
    expect(editor.text).toHaveLength(4000)
  })
})
