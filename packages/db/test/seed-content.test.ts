import { describe, expect, it } from "vitest"
import type { BundleCourse, BundleLesson, ContentBundle } from "@levelusp/contracts"
import {
  ContentBundleError, flatStepOf, listCourseLessons, resolvePrerequisiteId, toCourseInsert, toExamInsert, toExamQuestionInserts,
  toLessonInsert, toLessonQuizQuestionInserts, toLessonStepInserts, toModuleInsert, toTrackCourseInserts, toTrackInsert,
} from "../src/seed-content"
import { loadFixtureBundle } from "./support/bundles"

function courseOf(bundle: ContentBundle, slug: string): BundleCourse {
  const course = bundle.courses.find((candidate) => candidate.slug === slug)
  if (!course) throw new Error(`curso ${slug} não está na fixture`)
  return course
}

function lessonOf(bundle: ContentBundle, slug: string): BundleLesson {
  for (const course of bundle.courses) {
    for (const module of course.modules) {
      const lesson = module.lessons.find((candidate) => candidate.slug === slug)
      if (lesson) return lesson
    }
  }
  throw new Error(`lição ${slug} não está na fixture`)
}

const PLACEMENT = { courseId: "course-1", moduleId: "module-1", moduleTitle: "Primeiros passos", order: 1, authorId: "author-1" }

describe("pacote de conteúdo → linhas", () => {
  const bundle = loadFixtureBundle()

  it("a fixture é um pacote válido do formato 2", () => {
    expect(bundle.format).toBe(2)
    expect(bundle.tracks).toHaveLength(1)
    expect(bundle.courses.map((course) => course.slug)).toEqual(["n1-fundamentos", "n2-intermediario"])
  })

  it("trilha vira linha de tracks e vínculos ordenados por slug", () => {
    const [track] = bundle.tracks
    if (!track) throw new Error("fixture sem trilha")
    expect(toTrackInsert(track)).toEqual({
      slug: "python-ia", title: "Python: do zero à IA (mínima)", description: "Trilha de teste com dois níveis.", icon: "Sparkles",
      color: "bg-level-purple", sortOrder: 1, published: true, certificateTitle: "Python: do zero à IA",
    })
    const ids = new Map([["n1-fundamentos", "c1"], ["n2-intermediario", "c2"]])
    expect(toTrackCourseInserts(track, "t1", ids)).toEqual([
      { trackId: "t1", courseId: "c1", position: 1 },
      { trackId: "t1", courseId: "c2", position: 2 },
    ])
    expect(() => toTrackCourseInserts(track, "t1", new Map([["n1-fundamentos", "c1"]]))).toThrow(ContentBundleError)
  })

  it("curso vira linha sem pré-requisito; o pré-requisito é resolvido por slug", () => {
    const n2 = courseOf(bundle, "n2-intermediario")
    const row = toCourseInsert(n2, "author-1")
    expect(row).toMatchObject({ slug: "n2-intermediario", level: "intermediario", estimatedHours: 45, published: false, sequential: false, createdBy: "author-1" })
    expect(row).not.toHaveProperty("prerequisiteCourseId")
    const ids = new Map([["n1-fundamentos", "c1"], ["n2-intermediario", "c2"]])
    expect(resolvePrerequisiteId(n2, ids)).toBe("c1")
    expect(resolvePrerequisiteId(courseOf(bundle, "n1-fundamentos"), ids)).toBeNull()
    expect(() => resolvePrerequisiteId(n2, new Map([["n2-intermediario", "c2"]]))).toThrow(/pré-requisito "n1-fundamentos"/)
    expect(() => resolvePrerequisiteId({ ...n2, prerequisite: "n2-intermediario" }, ids)).toThrow(/si mesmo/)
  })

  it("prova e questões ficam numeradas e ativas", () => {
    const { exam } = courseOf(bundle, "n1-fundamentos")
    if (!exam) throw new Error("fixture sem prova")
    expect(toExamInsert(exam, "c1")).toEqual({
      courseId: "c1", title: "Prova do Nível 1", description: "Duas questões.", passingScore: 70, timeLimitMinutes: 30, cooldownMinutes: 30,
      questionsPerAttempt: null, active: true,
    })
    const questions = toExamQuestionInserts(exam, "e1")
    expect(questions.map((question) => question.sortOrder)).toEqual([0, 1])
    expect(questions[1]).toMatchObject({ examId: "e1", correctIndex: 1, topic: "Operadores", active: true })
  })

  it("módulo pertence ao curso e as lições recebem a posição no curso, módulo a módulo", () => {
    const n1 = courseOf(bundle, "n1-fundamentos")
    const [module] = n1.modules
    if (!module) throw new Error("fixture sem módulo")
    expect(toModuleInsert(module, "c1")).toMatchObject({ slug: "m1-primeiros-passos", courseId: "c1", sortOrder: 1, color: "bg-level-blue" })
    const entries = listCourseLessons(n1)
    expect(entries.map((entry) => [entry.lesson.slug, entry.order])).toEqual([
      ["n1-m1-01-ola-python", 1], ["n1-m1-02-variaveis", 2], ["n1-m1-03-fixacao", 3], ["n1-m1-04-como-funciona", 4],
    ])
    expect(entries.every((entry) => entry.module === module)).toBe(true)
  })

  it("lição guiada: campos planos vazios e um passo por linha, sem wrong_solutions", () => {
    const guided = lessonOf(bundle, "n1-m1-01-ola-python")
    expect(flatStepOf(guided)).toBeNull()
    const row = toLessonInsert(guided, PLACEMENT)
    expect(row).toMatchObject({
      slug: "n1-m1-01-ola-python", lessonType: "guided", runtime: "python", isProject: false, solutionAfterAttempts: 3, order: 1,
      module: "Primeiros passos", moduleId: "module-1", courseId: "course-1", createdBy: "author-1",
      objectives: ["Executar um programa Python e ler a saída", "Explicar o que `print` faz"],
      contentMarkdown: "", starterCode: "", starterFiles: [], checkpoints: [], testCases: [], solutionFiles: [],
    })
    const steps = toLessonStepInserts(guided, "l1")
    expect(steps.map((step) => [step.order, step.kind, step.xp])).toEqual([[1, "leitura", 10], [2, "exercicio", 20], [3, "quiz", 10]])
    const exercise = steps[1]
    expect(exercise).toMatchObject({ lessonId: "l1", title: "Seu primeiro print", hints: ["`print` recebe o texto entre aspas.", "Cada `print` escreve em uma linha nova."] })
    expect(exercise?.testCases).toHaveLength(2)
    expect(exercise?.testCases?.[0]).toMatchObject({ id: "saida", checkpoint: 1 })
    expect(exercise?.solutionFiles?.[0]?.content).toContain("Olá, mundo!")
    expect(exercise).not.toHaveProperty("wrong_solutions")
    expect(steps[2]?.quizQuestions?.[0]).toMatchObject({ correct_index: 1, options: ["show()", "print()", "echo()"] })
    expect(toLessonQuizQuestionInserts(guided, "l1")).toEqual([])
  })

  it("lição prática clássica: o único passo preenche os campos planos e não vira linha de passo", () => {
    const coding = lessonOf(bundle, "n1-m1-02-variaveis")
    expect(flatStepOf(coding)?.kind).toBe("exercicio")
    const row = toLessonInsert(coding, { ...PLACEMENT, order: 2 })
    expect(row).toMatchObject({
      lessonType: "coding", order: 2, solutionAfterAttempts: 2,
      contentMarkdown: "Crie `linguagem` com o texto Python.",
      starterCode: "# linguagem = ...\n",
      checkpoints: [{ id: 1, instruction: "Crie a variável `linguagem`.", hint: "Use aspas." }],
      solutionFiles: [{ path: "main.py", content: 'linguagem = "Python"\n' }],
    })
    expect(row.starterFiles).toHaveLength(2)
    expect(row.testCases).toEqual([{ id: "v1", checkpoint: 1, kind: "variable", variable: "linguagem", expected: "Python", type: "str" }])
    expect(toLessonStepInserts(coding, "l2")).toEqual([])
    expect(toLessonQuizQuestionInserts(coding, "l2")).toEqual([])
  })

  it("lição quiz clássica: as questões do passo viram lesson_quiz_questions", () => {
    const quiz = lessonOf(bundle, "n1-m1-03-fixacao")
    const row = toLessonInsert(quiz, { ...PLACEMENT, order: 3 })
    expect(row).toMatchObject({ lessonType: "quiz", quizPassingScore: 60, contentMarkdown: "Responda.", testCases: [], solutionAfterAttempts: 0 })
    expect(toLessonQuizQuestionInserts(quiz, "l3")).toEqual([
      { lessonId: "l3", prompt: "2 + 2?", options: ["3", "4"], correctIndex: 1, explanation: "", sortOrder: 0 },
      { lessonId: "l3", prompt: "Tipo de 1.5?", options: ["int", "float", "str"], correctIndex: 1, explanation: "Ponto flutuante.", sortOrder: 1 },
    ])
    expect(toLessonStepInserts(quiz, "l3")).toEqual([])
  })

  it("lição de leitura clássica: a narrativa vira content_markdown", () => {
    const theory = lessonOf(bundle, "n1-m1-04-como-funciona")
    const row = toLessonInsert(theory, { ...PLACEMENT, order: 4, authorId: null })
    expect(row).toMatchObject({ lessonType: "theory", published: false, contentMarkdown: "# Como funciona\n\nTexto da leitura.", createdBy: null })
  })

  it("projeto em python-dados carrega runtime, bibliotecas e a marca de projeto", () => {
    const project = lessonOf(bundle, "n2-m1-01-projeto-dados")
    const row = toLessonInsert(project, PLACEMENT)
    expect(row).toMatchObject({ runtime: "python-dados", libraries: ["numpy"], isProject: true, solutionAfterAttempts: 5, xpReward: 300 })
    expect(toLessonStepInserts(project, "l5")[0]?.testCases?.[0]).toMatchObject({ kind: "variable", tolerance: 0.001 })
  })

  it("lição clássica com passo de outro tipo é recusada pela transformação", () => {
    const coding = lessonOf(bundle, "n1-m1-02-variaveis")
    const quizStep = lessonOf(bundle, "n1-m1-03-fixacao").steps[0]
    if (!quizStep) throw new Error("fixture sem passo de quiz")
    expect(() => flatStepOf({ ...coding, steps: [quizStep] })).toThrow(ContentBundleError)
    expect(() => toLessonInsert({ ...coding, steps: [] }, PLACEMENT)).toThrow(/exatamente um passo exercicio/)
  })
})
