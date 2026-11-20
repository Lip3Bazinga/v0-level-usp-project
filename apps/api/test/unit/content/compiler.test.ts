import { readFileSync } from "node:fs"
import path from "node:path"
import { contentBundleSchema } from "@levelusp/contracts"
import { afterEach, describe, expect, it } from "vitest"
import { locateIssue, serializeBundle, validateBundle } from "../../../scripts/content/bundle"
import { compileContent } from "../../../scripts/content/compiler"
import { lintContent } from "../../../scripts/content/lint"
import { sortProblems } from "../../../scripts/content/source-map"
import { COURSE_YAML, EXAMPLE_DIR, expectProblems, frontmatter, guidedLesson, practiceLesson, readingStep, validTree, writeTree, type TempTree } from "./fixtures"

describe("compileContent com content/exemplo", () => {
  const compiled = compileContent({ contentDir: EXAMPLE_DIR })

  it("compila sem problemas, passa no lint e valida no contentBundleSchema", () => {
    expect(compiled.problems).toEqual([])
    expect(lintContent(compiled)).toEqual([])
    expect(compiled.stats).toEqual({ tracks: 1, courses: 1, modules: 1, lessons: 3, steps: 9 })
    const validation = validateBundle(compiled, "2026-11-05T00:00:00.000Z")
    expect(validation.problems).toEqual([])
    expect(validation.bundle).not.toBeNull()
    expect(() => contentBundleSchema.parse(JSON.parse(serializeBundle(validation.bundle ?? { format: 2, tracks: [], courses: [], assets: {} })))).not.toThrow()
  })

  it("grava o pacote minificado (uma linha), sem perder nada ao ler de volta", () => {
    const bundle = validateBundle(compiled, "2026-11-05T00:00:00.000Z").bundle
    if (!bundle) throw new Error("pacote inválido")
    const text = serializeBundle(bundle)
    expect(text.endsWith("\n")).toBe(true)
    expect(text.trimEnd()).not.toContain("\n")
    expect(JSON.parse(text)).toEqual(bundle)
    expect(text.length).toBeLessThan(JSON.stringify(bundle, null, 2).length)
  })

  it("tem a estrutura do §6.2: trilha → cursos → módulos → lições → passos", () => {
    const validation = validateBundle(compiled, "2026-11-05T00:00:00.000Z")
    const bundle = validation.bundle
    if (!bundle) throw new Error("pacote inválido")
    expect(Object.keys(bundle)).toEqual(["format", "generated_at", "tracks", "courses", "assets"])
    expect(bundle.tracks).toEqual([
      expect.objectContaining({ slug: "trilha-exemplo", title: "Trilha de exemplo", sort_order: 1, published: false, courses: ["curso-exemplo"] }),
    ])
    const [course] = bundle.courses
    expect(course).toMatchObject({ slug: "curso-exemplo", level: "iniciante", tags: ["python", "exemplo"], estimated_hours: 1, order: 1, prerequisite: null, sequential: true })
    expect(course?.exam).toMatchObject({ title: "Prova do curso de exemplo", passing_score: 70, time_limit_minutes: 20, cooldown_minutes: 30, questions_per_attempt: null })
    expect(course?.exam?.questions.map((question) => [question.correct_index, question.topic])).toEqual([[1, "Saída"], [1, "Funções"]])
    expect(course?.modules.map((module) => [module.slug, module.sort_order, module.lessons.map((lesson) => lesson.slug)])).toEqual([
      ["exemplo-m1-primeiros-passos", 1, ["exemplo-m1-01-ola-python", "exemplo-m1-02-funcoes-basicas", "exemplo-m1-03-recursos-de-apresentacao"]],
    ])
    const [guided, practice] = course?.modules[0]?.lessons ?? []
    expect(guided?.lesson_type).toBe("guided")
    expect(guided?.steps.map((step) => [step.order, step.kind, step.test_cases.length, step.wrong_solutions.length, step.quiz_questions.length])).toEqual([
      [1, "leitura", 0, 0, 0],
      [2, "exercicio", 3, 3, 0],
      [3, "quiz", 0, 0, 2],
    ])
    expect(practice?.lesson_type).toBe("coding")
    expect(practice?.steps.map((step) => [step.kind, step.checkpoints.length, step.test_cases.map((testCase) => testCase.kind), step.hints.length])).toEqual([
      ["exercicio", 3, ["call", "call", "call", "call", "expr", "source", "variable"], 3],
    ])
  })

  it("a lição-modelo do exemplo usa todos os recursos de apresentação e os novos formatos de exercício", () => {
    const lesson = compiled.bundle.courses[0]?.modules[0]?.lessons[2]
    expect(lesson?.steps.map((step) => [step.order, step.kind, step.exercise_mode, step.parsons_lines.length, step.expected_output !== ""])).toEqual([
      [1, "leitura", "codigo", 0, false],
      [2, "exercicio", "lacunas", 0, false],
      [3, "exercicio", "ordenar", 7, false],
      [4, "previsao", "codigo", 0, true],
      [5, "quiz", "codigo", 0, false],
    ])
    const narrative = lesson?.steps[0]?.narrative_markdown ?? ""
    expect(narrative).toContain("$$\n\\bar{x} = \\frac{1}{n} \\sum_{i=1}^{n} x_i\n$$")
    expect(narrative).toContain("R\\$ 25,00")
    expect(narrative).toContain("```mermaid\nflowchart TD")
    expect(narrative).toContain("```python visualizar\nnotas = [6, 8, 10]")
    expect(narrative).toContain("::video[Média aritmética em dois minutos](https://www.youtube-nocookie.com/embed/AAAAAAAAAAA)\n> Resumo: ")
    expect(narrative).toMatch(/!\[Notas 6, 8 e 10[^\]]+\]\(\/api\/content\/assets\/curso-exemplo\/exemplo-m1-primeiros-passos\/media-na-reta\.svg\?v=[0-9a-f]{12}\)/)
    expect(Object.keys(compiled.bundle.assets)).toEqual(["curso-exemplo/exemplo-m1-primeiros-passos/media-na-reta.svg"])
    expect(compiled.bundle.assets["curso-exemplo/exemplo-m1-primeiros-passos/media-na-reta.svg"]?.content_type).toBe("image/svg+xml")
    // O passo de ordenar não tem código inicial e as linhas não saem na ordem da solução nem indentadas.
    const parsons = lesson?.steps[2]
    expect(parsons?.starter_files).toEqual([])
    expect(parsons?.parsons_lines.map((line) => line.text).sort()).toEqual([
      'def situacao(notas):', 'if media > 6:', 'if media >= 6:', 'media = sum(notas) / len(notas)', 'return "aprovado"', 'return "reprovado"', "return aprovado",
    ])
    expect(parsons?.parsons_lines[0]?.text).not.toBe("def situacao(notas):")
    expect(parsons?.parsons_lines.every((line) => line.text === line.text.trim())).toBe(true)
    // Compilar de novo dá o mesmo embaralhamento (pacote estável entre compilações).
    const again = compileContent({ contentDir: EXAMPLE_DIR }).bundle.courses[0]?.modules[0]?.lessons[2]?.steps[2]?.parsons_lines
    expect(again).toEqual(parsons?.parsons_lines)
  })

  it("exibe caminhos relativos à pasta pedida", () => {
    const relative = compileContent({ contentDir: EXAMPLE_DIR, displayRoot: EXAMPLE_DIR })
    const lesson = relative.bundle.courses[0]?.modules[0]?.lessons[0]
    expect(relative.locations.get(lesson ?? {})).toEqual({ file: "cursos/curso-exemplo/m1-primeiros-passos/01-ola-python.lvl.md", line: 1 })
  })
})

describe("compileContent com árvores temporárias", () => {
  let tree: TempTree | null = null
  afterEach(() => {
    tree?.cleanup()
    tree = null
  })

  it("ordena lições pelo prefixo numérico, módulos por ordem e cursos por ordem", () => {
    tree = writeTree({
      ...validTree(),
      "cursos/curso-teste/m1/10-decima.lvl.md": guidedLesson({ slug: "decima" }),
      "cursos/curso-teste/m1/02-pratica.lvl.md": practiceLesson({ slug: "segunda" }),
      "cursos/curso-teste/m0/modulo.yaml": "slug: modulo-zero\ntitulo: Módulo zero\nordem: 0\n",
      "cursos/curso-teste/m0/01-a.lvl.md": guidedLesson({ slug: "zero-a" }),
      "cursos/outro/curso.yaml": COURSE_YAML.replace("curso-teste", "curso-anterior").replace("ordem: 1", "ordem: 0"),
    })
    const compiled = compileContent({ contentDir: tree.dir })
    expect(compiled.problems).toEqual([])
    expect(compiled.bundle.courses.map((course) => course.slug)).toEqual(["curso-anterior", "curso-teste"])
    const course = compiled.bundle.courses[1]
    expect(course?.modules.map((module) => module.slug)).toEqual(["modulo-zero", "modulo-teste"])
    expect(course?.modules[1]?.lessons.map((lesson) => lesson.slug)).toEqual(["licao-teste", "segunda", "decima"])
  })

  it("aponta pasta sem curso.yaml/modulo.yaml, nome de lição inválido, prefixo repetido e YAML quebrado", () => {
    tree = writeTree({
      ...validTree(),
      "cursos/sem-curso/README.md": "x",
      "cursos/curso-teste/sem-modulo/notas.txt": "x",
      "cursos/curso-teste/m1/errado.lvl.md": guidedLesson({ slug: "errado" }),
      "cursos/curso-teste/m1/01-repetida.lvl.md": guidedLesson({ slug: "repetida" }),
      "cursos/curso-teste/prova.yaml": "titulo: [\n",
      "cursos/curso-teste/_rascunhos/qualquer.txt": "ignorado",
    })
    const compiled = compileContent({ contentDir: tree.dir })
    expectProblems(sortProblems(compiled.problems), [
      { file: "cursos/curso-teste/m1/01-repetida.lvl.md", line: null, message: "prefixo 01 repetido no módulo (também em 01-guiada.lvl.md)" },
      { file: "cursos/curso-teste/m1/errado.lvl.md", line: null, message: "nome de arquivo de lição inválido: use NN-slug.lvl.md (ex.: 01-ola-python.lvl.md)" },
      { file: "cursos/curso-teste/prova.yaml", line: 2, message: "YAML inválido" },
      { file: "cursos/curso-teste/sem-modulo", line: null, message: "pasta de módulo sem modulo.yaml (pastas auxiliares começam com _ ou .)" },
      { file: "cursos/sem-curso", line: null, message: "pasta de curso sem curso.yaml (pastas auxiliares começam com _ ou .)" },
    ])
    expect(compiled.bundle.courses[0]?.exam).toBeNull()
  })

  it("deixa fora do pacote a lição com problema e mantém as outras", () => {
    tree = writeTree({ ...validTree(), "cursos/curso-teste/m1/03-quebrada.lvl.md": "sem cabeçalho" })
    const compiled = compileContent({ contentDir: tree.dir })
    expectProblems(compiled.problems, [{ file: "cursos/curso-teste/m1/03-quebrada.lvl.md", line: 1, message: "cabeçalho YAML" }])
    expect(compiled.stats.lessons).toBe(2)
  })

  it("acusa a pasta cursos/ ausente", () => {
    tree = writeTree({ "trilhas/t.yaml": "slug: trilha\ntitulo: Trilha\ncursos: []\n" })
    const compiled = compileContent({ contentDir: tree.dir })
    expectProblems(compiled.problems, [{ file: ".", line: null, message: "pasta cursos/ não encontrada" }])
  })
})

describe("exemplos do content/README.md", () => {
  let tree: TempTree | null = null
  afterEach(() => {
    tree?.cleanup()
    tree = null
  })

  /** Blocos ````markdown do README: lições inteiras (com cabeçalho) e trechos de passo. */
  function readmeExamples(): string[] {
    const readme = readFileSync(path.resolve(EXAMPLE_DIR, "../README.md"), "utf8")
    return [...readme.matchAll(/^````markdown\n([\s\S]*?)^````$/gm)].map((match) => match[1] ?? "")
  }

  it("a lição python-dados com numpy compila, passa no lint e valida no schema", () => {
    const numpyLesson = readmeExamples().find((example) => example.includes("runtime: python-dados"))
    if (numpyLesson === undefined) throw new Error("exemplo python-dados não encontrado no README")
    tree = writeTree({ ...validTree(), "cursos/curso-teste/m1/03-numpy.lvl.md": numpyLesson })
    const compiled = compileContent({ contentDir: tree.dir })
    expect(compiled.problems).toEqual([])
    expect(lintContent(compiled)).toEqual([])
    const lesson = compiled.bundle.courses[0]?.modules[0]?.lessons[2]
    expect(lesson).toMatchObject({ slug: "n5-m1-02-media-com-numpy", runtime: "python-dados", libraries: ["numpy"], lesson_type: "coding" })
    expect(lesson?.steps[0]?.test_cases.map((testCase) => testCase.kind)).toEqual(["source", "call", "call", "expr"])
    expect(validateBundle(compiled, "2026-11-05T00:00:00.000Z").problems).toEqual([])
  })

  it("os trechos de passo do README (exercício e quiz) compilam dentro de uma lição guiada", () => {
    const [exercise, quiz] = readmeExamples().filter((example) => example.startsWith("## Passo"))
    if (exercise === undefined || quiz === undefined) throw new Error("trechos de passo não encontrados no README")
    tree = writeTree({ ...validTree(), "cursos/curso-teste/m1/03-readme.lvl.md": `${frontmatter({ slug: "readme-teste" })}\n${readingStep(1)}\n${exercise}\n${quiz}` })
    const compiled = compileContent({ contentDir: tree.dir })
    expect(compiled.problems).toEqual([])
    expect(lintContent(compiled)).toEqual([])
    expect(compiled.bundle.courses[0]?.modules[0]?.lessons[2]?.steps.map((step) => step.kind)).toEqual(["leitura", "exercicio", "quiz"])
  })
})

describe("exemplos dos recursos do P2b no content/README.md", () => {
  let tree: TempTree | null = null
  afterEach(() => {
    tree?.cleanup()
    tree = null
  })

  it("narrativa rica, lacunas, ordenar e Previsão do README compilam juntos, passam no lint e validam no schema", () => {
    const readme = readFileSync(path.resolve(EXAMPLE_DIR, "../README.md"), "utf8")
    const examples = [...readme.matchAll(/^````markdown\n([\s\S]*?)^````$/gm)].map((match) => match[1] ?? "")
    const find = (marker: string): string => {
      const example = examples.find((candidate) => candidate.includes(marker))
      if (example === undefined) throw new Error(`exemplo com "${marker}" não encontrado no README`)
      return example
    }
    const steps = [find("::video["), find("modo: lacunas"), find("modo: ordenar"), find("· Previsão ·")]
    tree = writeTree({
      ...validTree(),
      "cursos/curso-teste/m1/03-readme-p2b.lvl.md": `${frontmatter({ slug: "readme-p2b" })}\n${steps.join("\n")}`,
      "cursos/curso-teste/m1/assets/media-na-reta.svg": readFileSync(path.resolve(EXAMPLE_DIR, "cursos/curso-exemplo/m1-primeiros-passos/assets/media-na-reta.svg"), "utf8"),
    })
    const compiled = compileContent({ contentDir: tree.dir })
    expect(compiled.problems).toEqual([])
    expect(lintContent(compiled)).toEqual([])
    const lesson = compiled.bundle.courses[0]?.modules[0]?.lessons[2]
    expect(lesson?.steps.map((step) => [step.kind, step.exercise_mode])).toEqual([["leitura", "codigo"], ["exercicio", "lacunas"], ["exercicio", "ordenar"], ["previsao", "codigo"]])
    expect(Object.keys(compiled.bundle.assets)).toEqual(["curso-teste/modulo-teste/media-na-reta.svg"])
    expect(validateBundle(compiled, "2026-11-14T00:00:00.000Z").problems).toEqual([])
  })
})

describe("validateBundle e locateIssue", () => {
  let tree: TempTree | null = null
  afterEach(() => {
    tree?.cleanup()
    tree = null
  })

  it("traduz um problema do schema para arquivo:linha do objeto mais próximo", () => {
    tree = writeTree({ ...validTree(), "cursos/curso-teste/m1/03-repetida.lvl.md": guidedLesson() })
    const compiled = compileContent({ contentDir: tree.dir })
    const validation = validateBundle(compiled, "2026-11-05T00:00:00.000Z")
    expect(validation.bundle).toBeNull()
    expect(validation.problems).toEqual([{ file: "cursos/curso-teste/m1/03-repetida.lvl.md", line: 2, message: "slug: slug de lição repetido: licao-teste" }])
  })

  it("locateIssue usa a linha do campo quando ela é conhecida e o resto do caminho como rótulo", () => {
    const compiled = compileContent({ contentDir: EXAMPLE_DIR, displayRoot: EXAMPLE_DIR })
    const located = locateIssue(compiled.bundle, ["courses", 0, "modules", 0, "lessons", 0, "steps", 1, "hints", 5], compiled.locations)
    const step = compiled.bundle.courses[0]?.modules[0]?.lessons[0]?.steps[1]
    expect(located).toEqual({ file: "cursos/curso-exemplo/m1-primeiros-passos/01-ola-python.lvl.md", line: compiled.locations.getField(step ?? {}, "hints")?.line, label: "hints.5" })
    expect(located.line).toBeGreaterThan(compiled.locations.get(step ?? {})?.line ?? 0)
    expect(locateIssue(compiled.bundle, ["tracks", 9, "slug"], compiled.locations)).toEqual({ file: "(pacote)", line: null, label: "tracks.9.slug" })
  })
})
