import { describe, expect, it } from "vitest"
import {
  assembleParsonsCode, bundleAssetsSchema, contentAssetTypeOf, contentAssetUrl, contentBundleSchema, decodeBase64, describeUnsafeSvg, isParsonsSolutionOrder,
  lessonStepSchema, parsonsSolutionLines, parsonsSolutionPlacements, STEP_KINDS, stepPredictSchema, stepSubmitSchema,
} from "./index"

const SOLUTION = "def dobro(n):\n    resultado = 2 * n\n\n    return resultado\n"
const SHUFFLED = [{ id: "l1", text: "return resultado" }, { id: "l2", text: "def dobro(n):" }, { id: "l3", text: "return n" }, { id: "l4", text: "resultado = 2 * n" }]
const CASES = [{ id: "c1", kind: "call", function: "dobro", args: [4], expected: 8 }]
const PARSONS_STEP = { order: 1, kind: "exercicio", title: "Ordene", exercise_mode: "ordenar", solution_files: [{ path: "main.py", content: SOLUTION }], parsons_lines: SHUFFLED, test_cases: CASES }

const base64 = (text: string): string => btoa(String.fromCharCode(...new TextEncoder().encode(text)))
const svg = (inner: string): string => `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`
const issuesOf = (schema: { safeParse(value: unknown): { success: boolean; error?: { issues: { message: string }[] } } }, value: unknown): string[] =>
  schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? []

describe("exercício ordenar (Parsons)", () => {
  it("parsonsSolutionLines tira linhas em branco e separa o nível de indentação", () => {
    expect(parsonsSolutionLines(SOLUTION)).toEqual([{ text: "def dobro(n):", indent: 0 }, { text: "resultado = 2 * n", indent: 1 }, { text: "return resultado", indent: 1 }])
    expect(parsonsSolutionLines("if x:\n  y = 1\n\tz = 2\n").map((line) => line.indent)).toEqual([0, null, null])
  })

  it("as posições da solução remontam o código; distratores ficam de fora", () => {
    const placements = parsonsSolutionPlacements(SHUFFLED, SOLUTION)
    expect(placements).toEqual([{ line_id: "l2", indent: 0 }, { line_id: "l4", indent: 1 }, { line_id: "l1", indent: 1 }])
    expect(assembleParsonsCode(SHUFFLED, placements ?? [])).toBe("def dobro(n):\n    resultado = 2 * n\n    return resultado\n")
    expect(parsonsSolutionPlacements(SHUFFLED.slice(0, 2), SOLUTION)).toBeNull()
  })

  it("assembleParsonsCode recusa linha inexistente, repetida, indentação fora da faixa e lista vazia", () => {
    expect(assembleParsonsCode(SHUFFLED, [{ line_id: "l9", indent: 0 }])).toBeNull()
    expect(assembleParsonsCode(SHUFFLED, [{ line_id: "l1", indent: 0 }, { line_id: "l1", indent: 0 }])).toBeNull()
    expect(assembleParsonsCode(SHUFFLED, [{ line_id: "l1", indent: 13 }])).toBeNull()
    expect(assembleParsonsCode(SHUFFLED, [{ line_id: "l1", indent: 0.5 }])).toBeNull()
    expect(assembleParsonsCode(SHUFFLED, [])).toBeNull()
  })

  it("o schema do passo recusa linhas na ordem da solução, linhas que não montam a solução e linha indentada", () => {
    expect(lessonStepSchema.safeParse(PARSONS_STEP).success).toBe(true)
    const inOrder = [{ id: "l1", text: "def dobro(n):" }, { id: "l2", text: "return n" }, { id: "l3", text: "resultado = 2 * n" }, { id: "l4", text: "return resultado" }]
    expect(isParsonsSolutionOrder(inOrder, SOLUTION)).toBe(true)
    expect(isParsonsSolutionOrder(SHUFFLED, SOLUTION)).toBe(false)
    expect(issuesOf(lessonStepSchema, { ...PARSONS_STEP, parsons_lines: inOrder })).toEqual(["as linhas estão na ordem da solução: embaralhe antes de gravar"])
    expect(issuesOf(lessonStepSchema, { ...PARSONS_STEP, parsons_lines: SHUFFLED.slice(0, 3) })).toEqual([expect.stringContaining("as linhas não montam a solução")])
    expect(issuesOf(lessonStepSchema, { ...PARSONS_STEP, parsons_lines: [{ id: "l1", text: "    return resultado" }, ...SHUFFLED.slice(1)] })).toContainEqual(expect.stringContaining("não pode ter indentação"))
    expect(issuesOf(lessonStepSchema, { ...PARSONS_STEP, exercise_mode: "codigo" })).toEqual(["parsons_lines só vale em exercício de ordenar"])
    expect(issuesOf(lessonStepSchema, { ...PARSONS_STEP, kind: "leitura", test_cases: [] })).toEqual(["exercise_mode e parsons_lines só valem em passo de exercício"])
  })

  it("o corpo do Verificar aceita files OU arrangement, com indentação limitada", () => {
    expect(stepSubmitSchema.safeParse({ files: [{ path: "main.py", content: "x = 1" }] }).success).toBe(true)
    expect(stepSubmitSchema.safeParse({ arrangement: [{ line_id: "l1", indent: 0 }] }).success).toBe(true)
    expect(stepSubmitSchema.safeParse({}).success).toBe(false)
    expect(stepSubmitSchema.safeParse({ arrangement: [] }).success).toBe(false)
    expect(stepSubmitSchema.safeParse({ arrangement: [{ line_id: "l1", indent: 99 }] }).success).toBe(false)
    expect(stepSubmitSchema.safeParse({ arrangement: [{ line_id: "l1", indent: -1 }] }).success).toBe(false)
  })
})

describe("exercício de lacunas e passo de previsão", () => {
  it("lacunas exige ___ no código inicial", () => {
    const step = { order: 1, kind: "exercicio", title: "Complete", exercise_mode: "lacunas", test_cases: CASES }
    expect(lessonStepSchema.safeParse({ ...step, starter_files: [{ path: "main.py", content: "def dobro(n):\n    return ___\n" }] }).success).toBe(true)
    expect(issuesOf(lessonStepSchema, { ...step, starter_files: [{ path: "main.py", content: "def dobro(n):\n    return __init__\n" }] })).toEqual([expect.stringContaining("precisa de pelo menos uma lacuna (___)")])
  })

  it("previsão exige o código em main.py e a saída esperada; os outros tipos não aceitam expected_output", () => {
    expect(STEP_KINDS).toContain("previsao")
    const step = { order: 1, kind: "previsao", title: "O que imprime", starter_files: [{ path: "main.py", content: "print(1)\n" }], expected_output: "1" }
    expect(lessonStepSchema.parse(step)).toMatchObject({ kind: "previsao", expected_output: "1", exercise_mode: "codigo", parsons_lines: [] })
    expect(issuesOf(lessonStepSchema, { ...step, expected_output: "  " })).toEqual(["um passo de previsão precisa da saída esperada"])
    expect(issuesOf(lessonStepSchema, { ...step, starter_files: [] })).toEqual(["um passo de previsão precisa do código a ler em main.py"])
    expect(issuesOf(lessonStepSchema, { order: 1, kind: "leitura", title: "Leitura", expected_output: "1" })).toEqual(["expected_output só vale em passo de previsão"])
    expect(stepPredictSchema.safeParse({ output: "1\n2" }).success).toBe(true)
    expect(stepPredictSchema.safeParse({ output: "x".repeat(10_001) }).success).toBe(false)
    expect(stepPredictSchema.safeParse({}).success).toBe(false)
  })

  it("lição clássica do pacote não aceita modo lacunas (só lição guiada guarda o modo)", () => {
    const step = { order: 1, kind: "exercicio", title: "Complete", exercise_mode: "lacunas", test_cases: CASES, starter_files: [{ path: "main.py", content: "x = ___\n" }] }
    const bundle = (lessonType: string): unknown => ({
      format: 2,
      courses: [{ slug: "curso", title: "Curso", modules: [{ slug: "modulo", title: "Módulo", lessons: [{ slug: "licao", title: "Lição", lesson_type: lessonType, steps: [step] }] }] }],
    })
    expect(contentBundleSchema.safeParse(bundle("guided")).success).toBe(true)
    expect(issuesOf(contentBundleSchema, bundle("coding"))).toEqual(["o modo lacunas só vale em lição guiada"])
  })
})

describe("assets do pacote", () => {
  const PNG = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3))

  it("aceita SVG inerte e PNG com assinatura; o pacote ganha assets vazio por padrão", () => {
    const assets = { "curso/modulo/desenho.svg": { content_type: "image/svg+xml", base64: base64(svg("<circle r=\"4\"/>")) }, "curso/modulo/foto.png": { content_type: "image/png", base64: PNG } }
    expect(bundleAssetsSchema.safeParse(assets).success).toBe(true)
    expect(contentBundleSchema.parse({ format: 2, courses: [] }).assets).toEqual({})
    expect(contentAssetTypeOf("Foto.JPG")).toBe("image/jpeg")
    expect(contentAssetTypeOf("pagina.html")).toBeUndefined()
    expect(contentAssetUrl("curso/modulo/foto.png", "abc123")).toBe("/api/content/assets/curso/modulo/foto.png?v=abc123")
  })

  it("recusa SVG com script, evento, javascript:, foreignObject e entidades, mesmo disfarçados", () => {
    const active = [
      svg("<script>alert(1)</script>"), svg("<SCRIPT href=\"x.js\"/>"), svg("<svg:script>alert(1)</svg:script>"), svg("<circle onload=\"alert(1)\"/>"),
      svg("<circle\nONCLICK = \"alert(1)\"/>"), svg("<a href=\"javascript:alert(1)\">x</a>"), svg("<a xlink:href=\"java&#x73;cript:alert(1)\">x</a>"),
      svg("<a href=\"java\nscript:alert(1)\">x</a>"), svg("<a href=\"&#106;avascript&colon;alert(1)\">x</a>"), svg("<foreignObject><iframe/></foreignObject>"),
      "<!DOCTYPE svg [<!ENTITY x \"y\">]><svg xmlns=\"http://www.w3.org/2000/svg\">&x;</svg>", "<html><body>não é svg</body></html>",
    ]
    for (const content of active) {
      expect(describeUnsafeSvg(new TextEncoder().encode(content)), content).not.toBeNull()
      expect(bundleAssetsSchema.safeParse({ "curso/modulo/x.svg": { content_type: "image/svg+xml", base64: base64(content) } }).success, content).toBe(false)
    }
    expect(describeUnsafeSvg(new TextEncoder().encode(svg("<text>one, online, onde fica: aqui</text>")))).toBeNull()
    // A conferência é conservadora (texto inteiro, não só dentro das tags): "fica onde = aqui" num rótulo também é recusado.
    expect(describeUnsafeSvg(new TextEncoder().encode(svg("<text>fica onde = aqui</text>")))).toBe("atributo de evento (on…=)")
    expect(describeUnsafeSvg(new Uint8Array([0xff, 0xfe, 0x00]))).toBe("o arquivo não é texto UTF-8")
  })

  it("recusa caminho fora do formato, tipo que não bate com a extensão ou com os bytes e base64 inválido", () => {
    const safe = { content_type: "image/svg+xml", base64: base64(svg("")) }
    for (const assetPath of ["../x.svg", "curso/modulo/../x.svg", "curso/x.svg", "curso/modulo/sub/x.svg", "/curso/modulo/x.svg", "curso/modulo/x.html", "Curso/modulo/x.svg", "curso/modulo/.x.svg", "curso/modulo/x.svg/"]) {
      expect(issuesOf(bundleAssetsSchema, { [assetPath]: safe }), assetPath).toEqual([expect.stringContaining("caminho de asset inválido")])
    }
    expect(issuesOf(bundleAssetsSchema, { "curso/modulo/x.png": safe })).toEqual(["content_type não corresponde à extensão do arquivo"])
    expect(issuesOf(bundleAssetsSchema, { "curso/modulo/x.png": { content_type: "image/png", base64: base64(svg("")) } })).toEqual([expect.stringContaining("o conteúdo não é image/png")])
    expect(issuesOf(bundleAssetsSchema, { "curso/modulo/x.svg": { content_type: "image/svg+xml", base64: "###=" } })).toEqual(["base64 inválido"])
    expect(decodeBase64("QUJD")).toEqual(new Uint8Array([65, 66, 67]))
    expect(decodeBase64("QUJ")).toBeNull()
  })
})
