import katex from "katex"
import type { LessonStep, LessonStepInput, StepQuizResult } from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"

/** Prefixo dos ids dos passos da prévia (`previa-<order>`): estáveis enquanto a ordem não muda. */
export const PREVIEW_STEP_ID_PREFIX = "previa-"

/** Passos prontos para o player e o índice do que o professor digitou, por id do passo. */
export interface PreviewSteps {
  steps: LessonStep[]
  byId: Map<string, LessonStepInput>
}

/**
 * Converte os passos do editor (com gabarito) no DTO que o player do aluno consome (sem
 * `solution_files`, casos, `expected_output` nem `correct_index`/`explanation` do quiz). O que o
 * gabarito precisa (dicas, solução, resposta certa) fica em `byId`, só para a prévia local.
 *
 * @param lessonId id da lição aberta no editor, ou um valor fixo quando ela ainda não foi salva.
 */
export function buildPreviewSteps(steps: readonly LessonStepInput[], lessonId: string): PreviewSteps {
  const byId = new Map<string, LessonStepInput>()
  const previewSteps = steps.map((input): LessonStep => {
    const id = `${PREVIEW_STEP_ID_PREFIX}${input.order}`
    byId.set(id, input)
    return {
      id,
      lesson_id: lessonId,
      order: input.order,
      kind: input.kind,
      title: input.title,
      narrative_markdown: input.narrative_markdown,
      starter_files: input.starter_files,
      checkpoints: input.checkpoints,
      test_case_count: input.test_cases.length,
      hint_count: input.hints.length,
      quiz_questions: input.quiz_questions.map((question) => ({ prompt: question.prompt, options: question.options })),
      xp: input.xp,
      exercise_mode: input.exercise_mode,
      parsons_lines: input.parsons_lines,
    }
  })
  return { steps: previewSteps, byId }
}

/**
 * Assinatura do que "semeia" o estado interno de um passo (código inicial, lacunas, linhas, quiz).
 * O player só lê essas props ao montar; a prévia usa a assinatura na `key` para recomeçar o passo
 * quando o professor muda algo que o estado não acompanharia sozinho. Texto da narrativa, dicas e
 * solução não entram: atualizam sem perder o que foi digitado na prévia.
 */
export function stepSeedKey(input: LessonStepInput): string {
  return JSON.stringify([
    input.kind,
    input.exercise_mode,
    input.starter_files,
    input.parsons_lines,
    input.quiz_questions.map((question) => [question.prompt, question.options]),
  ])
}

/** Todos os textos em Markdown de um passo (o que o aluno lê), para procurar problemas de conteúdo. */
export function markdownSources(step: LessonStepInput): string[] {
  return [
    step.narrative_markdown,
    ...step.checkpoints.map((checkpoint) => checkpoint.instruction),
    ...step.hints,
    ...step.quiz_questions.flatMap((question) => [question.prompt, ...question.options, question.explanation]),
  ]
}

const MERMAID_BLOCK = /^[ \t]*```mermaid[^\n]*\n([\s\S]*?)^[ \t]*```/gm

/** Código de cada bloco ```mermaid dos textos de um passo (a validação do diagrama é assíncrona, na tela). */
export function mermaidBlocks(step: LessonStepInput): string[] {
  return markdownSources(step).flatMap((source) => [...source.matchAll(MERMAID_BLOCK)].map((match) => (match[1] ?? "").replace(/\n$/, "")))
}

const FENCED_CODE = /^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[ \t]*$/gm
const INLINE_CODE = /`[^`\n]*`/g
const BLOCK_MATH = /\$\$([\s\S]+?)\$\$/g
const INLINE_MATH = /(?<![\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g
const IMAGE_WITHOUT_ALT = /!\[\s*\]\(/

function withoutCode(markdown: string): string {
  return markdown.replace(FENCED_CODE, "").replace(INLINE_CODE, "")
}

function invalidFormulas(markdown: string): string[] {
  const text = withoutCode(markdown)
  const formulas = [
    ...[...text.matchAll(BLOCK_MATH)].map((match) => ({ source: match[1] ?? "", displayMode: true })),
    ...[...text.replace(BLOCK_MATH, "").matchAll(INLINE_MATH)].map((match) => ({ source: match[1] ?? "", displayMode: false })),
  ]
  return formulas.filter(({ source, displayMode }) => {
    try {
      katex.renderToString(source, { throwOnError: true, displayMode })
      return false
    } catch {
      return true
    }
  }).map(({ source }) => source.trim())
}

const hasContent = (files: LessonStepInput["solution_files"]): boolean => files.some((file) => file.content.trim() !== "")

function requiredFieldWarnings(step: LessonStepInput): string[] {
  const warnings: string[] = []
  if (step.title.trim() === "") warnings.push("O passo está sem título.")
  if (step.kind === "exercicio") {
    if (step.checkpoints.length === 0) warnings.push("O exercício está sem instruções.")
    if (!hasContent(step.solution_files)) warnings.push("O exercício está sem solução de referência.")
    if (step.test_cases.length === 0) warnings.push("O exercício está sem casos de teste.")
  }
  if (step.kind === "previsao") {
    const code = step.starter_files.find((file) => file.path === MAIN_FILE_PATH) ?? step.starter_files[0]
    if (!code || code.content.trim() === "") warnings.push("A previsão está sem código para o aluno ler.")
    if (step.expected_output.trim() === "") warnings.push("A previsão está sem a saída esperada.")
  }
  if (step.kind === "quiz") {
    if (step.quiz_questions.length === 0) warnings.push("O quiz está sem questões.")
    step.quiz_questions.forEach((question, index) => {
      const where = `Questão ${index + 1} do quiz`
      if (question.prompt.trim() === "") warnings.push(`${where}: sem enunciado.`)
      if (question.options.length < 2) warnings.push(`${where}: precisa de pelo menos 2 alternativas.`)
      if (question.correct_index < 0 || question.correct_index >= question.options.length) warnings.push(`${where}: a alternativa correta está fora das alternativas.`)
    })
  }
  return warnings
}

/**
 * Avisos de conteúdo de um passo, em pt-BR: imagem sem texto alternativo (`![](…)`), fórmula KaTeX
 * que o KaTeX recusa e campos obrigatórios que faltam. Puro e síncrono; o Mermaid inválido é
 * checado na tela (assíncrono) com {@link mermaidBlocks}.
 */
export function contentWarnings(step: LessonStepInput): string[] {
  const sources = markdownSources(step)
  const warnings = requiredFieldWarnings(step)
  if (sources.some((source) => IMAGE_WITHOUT_ALT.test(withoutCode(source)))) warnings.push("Há imagem sem texto alternativo: escreva a descrição entre os colchetes, como ![descrição](…).")
  for (const formula of sources.flatMap(invalidFormulas)) warnings.push(`Fórmula KaTeX inválida: ${formula}`)
  return warnings
}

/**
 * Corrige o quiz de um passo na própria prévia (o professor já tem o gabarito): devolve o mesmo
 * formato da API, com a explicação de TODAS as questões (o aluno só recebe a das acertadas).
 * Não credita nada: o efeito na gamificação vem sempre zerado.
 *
 * @param answers índice da alternativa escolhida, na ordem das questões.
 * @param passingScore nota mínima (%) para aprovar, a da lição.
 */
export function gradeQuizLocally(step: LessonStepInput, answers: readonly number[], passingScore: number, stepId: string): StepQuizResult {
  const review = step.quiz_questions.map((question, index) => ({ index, correct: answers[index] === question.correct_index, explanation: question.explanation }))
  const total = review.length
  const correctCount = review.filter((item) => item.correct).length
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100)
  return {
    step_completed: false, xp_awarded: 0, lesson_completed: false, granted_badges: [], level_up: false, new_level: 0,
    step_id: stepId, score, passed: total > 0 && score >= passingScore, passing_score: passingScore, correct_count: correctCount, total, review,
  }
}
