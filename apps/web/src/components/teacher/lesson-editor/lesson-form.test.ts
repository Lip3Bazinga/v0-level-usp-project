import { describe, expect, it } from "vitest"
import type { LessonWithTests } from "@levelusp/contracts"
import { DEFAULT_FORM, diffLessonInput, formFromLesson, toLessonInput, validateLessonForm, validateQuiz } from "./lesson-form"

const LESSON: LessonWithTests = {
  id: "l1", title: "Variáveis", description: "d", slug: "variaveis", module: "Python Básico", order: 2,
  difficulty: "iniciante", content_markdown: "<p>x</p>", starter_code: "print(1)", starter_files: [],
  checkpoints: [{ id: 1, instruction: "faça", hint: "" }], libraries: null, xp_reward: 50, time_limit: 10,
  lesson_type: "coding", quiz_passing_score: 70, course_id: null, module_id: null, created_by: "u",
  published: false, created_at: "", updated_at: "",
  test_cases: [{ kind: "io", id: "a", stdin: "", expected_stdout: "1", match: "trimmed" }],
}

describe("formulário da lição", () => {
  it("usa starter_code como main.py quando não há starter_files", () => {
    const f = formFromLesson(LESSON)
    expect(f.starter_files).toEqual([{ path: "main.py", content: "print(1)" }])
    expect(f.libraries).toEqual([])
  })

  it("monta o LessonInput com starter_code espelhando o main.py e sem dicas vazias", () => {
    const input = toLessonInput(formFromLesson(LESSON), LESSON.test_cases)
    expect(input.starter_code).toBe("print(1)")
    expect(input.checkpoints).toEqual([{ id: 1, instruction: "faça" }])
    expect(input.test_cases).toEqual(LESSON.test_cases)
  })

  it("PATCH contém só os campos alterados", () => {
    const before = toLessonInput(formFromLesson(LESSON), LESSON.test_cases)
    const after = toLessonInput({ ...formFromLesson(LESSON), title: "Variáveis 2" }, [])
    expect(diffLessonInput(before, after)).toEqual({ title: "Variáveis 2", test_cases: [] })
    expect(diffLessonInput(before, before)).toEqual({})
  })

  it("valida título e questionário", () => {
    expect(validateLessonForm({ ...DEFAULT_FORM, title: "ab" })).toMatch(/3 caracteres/)
    expect(validateLessonForm({ ...DEFAULT_FORM, title: "Lição boa" })).toBeNull()
    expect(validateQuiz([])).toMatch(/pelo menos uma questão/)
    expect(validateQuiz([{ id: "q", prompt: "P?", options: ["a", ""], correct_index: 0, explanation: "", sort_order: 0 }]))
      .toMatch(/alternativas vazias/)
  })
})
