import type { LessonStep, LessonStepInput } from "@levelusp/contracts"
import type { LessonStepInsert, LessonStepRow } from "@levelusp/db"
import { sanitizeRichContent } from "@/common/sanitize/rich-content"

/**
 * Passo como o ALUNO vê. Lista os campos um a um (sem spread): `solutionFiles`,
 * `testCases`, o texto das dicas e o `correct_index`/`explanation` das questões
 * nunca são serializados, mesmo recebendo a linha cheia.
 */
export function toLessonStep(step: LessonStepRow): LessonStep {
  return {
    id: step.id,
    lesson_id: step.lessonId,
    order: step.order,
    kind: step.kind,
    title: step.title,
    narrative_markdown: step.narrativeMarkdown,
    starter_files: step.starterFiles,
    checkpoints: step.checkpoints,
    test_case_count: step.testCases.length,
    hint_count: step.hints.length,
    quiz_questions: step.quizQuestions.map((question) => ({ prompt: question.prompt, options: question.options })),
    xp: step.xp,
  }
}

/** Passo COM gabarito, no formato de entrada — SOMENTE para o dono ou admin (telas de autoria). */
export function toLessonStepInput(step: LessonStepRow): LessonStepInput {
  return {
    order: step.order,
    kind: step.kind,
    title: step.title,
    narrative_markdown: step.narrativeMarkdown,
    starter_files: step.starterFiles,
    solution_files: step.solutionFiles,
    checkpoints: step.checkpoints,
    test_cases: step.testCases,
    hints: step.hints,
    quiz_questions: step.quizQuestions,
    xp: step.xp,
  }
}

/** Entrada do professor → linha de `lesson_steps` (a narrativa é sanitizada como o conteúdo da lição). */
export function toLessonStepInsert(step: LessonStepInput, lessonId: string): LessonStepInsert {
  return {
    lessonId,
    order: step.order,
    kind: step.kind,
    title: step.title,
    narrativeMarkdown: sanitizeRichContent(step.narrative_markdown),
    starterFiles: step.starter_files,
    solutionFiles: step.solution_files,
    checkpoints: step.checkpoints,
    testCases: step.test_cases,
    hints: step.hints,
    quizQuestions: step.quiz_questions,
    xp: step.xp,
  }
}
