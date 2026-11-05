import { describe, expect, it } from "vitest"
import type { ContentProblem } from "../../../scripts/content/source-map"
import { SourceMap } from "../../../scripts/content/source-map"
import { loadCourseFields, loadExam, loadModuleFields, loadTrack } from "../../../scripts/content/yaml-content"
import { parseYamlText, toYamlPath, translateYamlKeys, YamlSyntaxError } from "../../../scripts/content/yaml-file"
import { COURSE_YAML, EXAM_YAML, expectProblems, MODULE_YAML, TRACK_YAML } from "./fixtures"

function load<T>(loader: (yaml: ReturnType<typeof parseYamlText>, problems: ContentProblem[], locations: SourceMap) => T, text: string, file = "x.yaml"): { value: T; problems: ContentProblem[]; locations: SourceMap } {
  const problems: ContentProblem[] = []
  const locations = new SourceMap()
  const value = loader(parseYamlText(text, file), problems, locations)
  return { value, problems, locations }
}

describe("YAML de curso, módulo, prova e trilha", () => {
  it("traduz curso.yaml com os padrões do pacote e guarda a linha de cada chave", () => {
    const { value, problems, locations } = load(loadCourseFields, COURSE_YAML, "cursos/c/curso.yaml")
    expect(problems).toEqual([])
    expect(value).toEqual({
      slug: "curso-teste",
      title: "Curso de teste",
      description: "Um curso.",
      long_description: "",
      level: "iniciante",
      tags: [],
      estimated_hours: 0,
      order: 1,
      published: true,
      prerequisite: null,
      sequential: false,
    })
    if (!value) throw new Error("curso inválido")
    expect(locations.get(value)).toEqual({ file: "cursos/c/curso.yaml", line: 1 })
    expect(locations.getField(value, "order")).toEqual({ file: "cursos/c/curso.yaml", line: 5 })
  })

  it("traduz modulo.yaml e trilha", () => {
    expect(load(loadModuleFields, MODULE_YAML).value).toEqual({ slug: "modulo-teste", title: "Módulo de teste", description: "Um módulo.", icon: "BookOpen", color: "bg-level-purple", sort_order: 1 })
    expect(load(loadTrack, TRACK_YAML).value).toMatchObject({ slug: "trilha-teste", title: "Trilha de teste", sort_order: 1, published: true, courses: ["curso-teste"], certificate_title: "" })
  })

  it("traduz prova.yaml, inclusive as chaves das questões, e localiza cada questão", () => {
    const { value, problems, locations } = load(loadExam, EXAM_YAML)
    expect(problems).toEqual([])
    expect(value).toMatchObject({
      title: "Prova de teste",
      passing_score: 70,
      time_limit_minutes: 45,
      cooldown_minutes: 60,
      questions_per_attempt: null,
      questions: [{ prompt: "Quanto é 1 + 1?", options: ["1", "2"], correct_index: 1, explanation: "Dois.", topic: "Soma" }],
    })
    expect(locations.get(value?.questions[0] ?? {})).toEqual({ file: "x.yaml", line: 4 })
  })

  it("aponta chave desconhecida na linha dela e valor inválido na linha da chave", () => {
    const { problems } = load(loadCourseFields, "slug: curso\ntitulo: Curso de teste\nhoras: muitas\ncor: azul\n", "curso.yaml")
    expectProblems(problems, [
      { file: "curso.yaml", line: 4, message: "chave desconhecida: cor" },
      { file: "curso.yaml", line: 3, message: /^horas: / },
    ])
  })

  it("aponta a questão errada da prova pela linha dela", () => {
    const text = "titulo: Prova\nquestoes:\n  - enunciado: Certa\n    opcoes: [a, b]\n    correta: 0\n  - enunciado: Errada\n    opcoes: [a, b]\n    correta: 5\n"
    const { problems } = load(loadExam, text, "prova.yaml")
    expect(problems).toEqual([{ file: "prova.yaml", line: 8, message: "questoes.1.correta: correct_index fora das opções" }])
  })

  it("exige um mapa no topo e recusa YAML inválido ou com chave repetida", () => {
    const { problems } = load(loadTrack, "- a\n- b\n")
    expect(problems).toEqual([{ file: "x.yaml", line: 1, message: "o arquivo precisa ser um mapa YAML (chave: valor)" }])
    expect(() => parseYamlText("slug: a\nslug: b\n", "x.yaml")).toThrow(YamlSyntaxError)
    expect(() => parseYamlText("titulo: [\n", "x.yaml")).toThrow(/YAML inválido/)
  })

  it("traduz caminhos do schema de volta para as chaves do YAML", () => {
    const spec = { questoes: { name: "questions", items: { correta: "correct_index" } }, titulo: "title" }
    expect(toYamlPath(["questions", 1, "correct_index"], spec)).toEqual(["questoes", 1, "correta"])
    expect(toYamlPath(["title"], spec)).toEqual(["titulo"])
    expect(toYamlPath(["desconhecido", 0], spec)).toEqual(["desconhecido", 0])
  })

  it("translateYamlKeys mantém valores e traduz listas de mapas", () => {
    const problems: ContentProblem[] = []
    const yaml = parseYamlText("titulo: T\nquestoes:\n  - correta: 1\n    extra: x\n", "p.yaml")
    const translated = translateYamlKeys(yaml, { titulo: "title", questoes: { name: "questions", items: { correta: "correct_index" } } }, problems)
    expect(translated).toEqual({ title: "T", questions: [{ correct_index: 1 }] })
    expectProblems(problems, [{ file: "p.yaml", line: 4, message: "chave desconhecida: extra" }])
  })
})
