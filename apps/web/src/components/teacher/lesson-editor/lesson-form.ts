import type {
  Checkpoint, Difficulty, LessonInput, LessonType, LessonUpdateInput, LessonWithTests, ProjectFile, QuizQuestionFull,
  QuizQuestionInput, TestCase,
} from "@levelusp/contracts"
import { MAIN_FILE_PATH } from "@/lib/constants"
import { resolveStarterFiles } from "@/lib/utils"
import { diffChangedFields } from "@/lib/utils/object-diff"

const MAX_TITLE_LENGTH = 160
const MIN_TITLE_LENGTH = 3
const MAX_QUIZ_QUESTIONS = 50
const MIN_QUIZ_OPTIONS = 2
const MAX_QUIZ_OPTIONS = 8
const MAX_STARTER_PATH_LENGTH = 200
const DEFAULT_QUIZ_PASSING_SCORE = 70

/** Limites aceitos pela API (`lessonInputSchema`). */
const LIMITS = {
  timeLimitMinutes: { min: 1, max: 300 },
  order: { min: 1, max: 10_000 },
  xpReward: { min: 0, max: 5_000 },
  quizPassingScore: { min: 1, max: 100 },
} as const

/** Estado do formulário do editor de lição (tudo que vai em `LessonInput`, menos os casos). */
export interface LessonFormState {
  title: string
  description: string
  module: string
  module_id: string | null
  course_id: string | null
  order: number
  difficulty: Difficulty
  lesson_type: LessonType
  content_markdown: string
  starter_files: ProjectFile[]
  checkpoints: Checkpoint[]
  libraries: string[]
  xp_reward: number
  /** Minutos (1–300). */
  time_limit: number
  quiz_passing_score: number
}

export const DEFAULT_STARTER = `# Escreva sua solução aqui

def soma(a, b):
    # Implemente a função
    pass

resultado = soma(2, 3)
print(f"Resultado: {resultado}")
`

export const DEFAULT_CONTENT = `<h3 class="text-base font-semibold text-foreground mb-3">Introdução</h3>
<p class="text-muted-foreground mb-4">
  Descreva aqui o conceito principal da lição.
</p>
<h3 class="text-base font-semibold text-foreground mb-3">Seu Desafio</h3>
<p class="text-muted-foreground">
  Explique o que o aluno deve implementar.
</p>`

/** Gabarito inicial coerente com o `DEFAULT_STARTER`. */
export const DEFAULT_TEST_CASES: TestCase[] = [
  { kind: "call", id: "soma-positivos", name: "soma de positivos", function: "soma", args: [2, 3], kwargs: {}, expected: 5 },
  { kind: "call", id: "soma-negativos", name: "soma de negativos", function: "soma", args: [-1, -1], kwargs: {}, expected: -2 },
  { kind: "call", id: "soma-zeros", name: "soma de zeros", function: "soma", args: [0, 0], kwargs: {}, expected: 0 },
]

export const DEFAULT_FORM: LessonFormState = {
  title: "",
  description: "",
  module: "",
  module_id: null,
  course_id: null,
  order: 1,
  difficulty: "iniciante",
  lesson_type: "coding",
  content_markdown: DEFAULT_CONTENT,
  starter_files: [{ path: MAIN_FILE_PATH, content: DEFAULT_STARTER }],
  checkpoints: [],
  libraries: [],
  xp_reward: 50,
  time_limit: 10,
  quiz_passing_score: DEFAULT_QUIZ_PASSING_SCORE,
}

export function formFromLesson(lesson: LessonWithTests): LessonFormState {
  return {
    title: lesson.title,
    description: lesson.description ?? "",
    module: lesson.module ?? "",
    module_id: lesson.module_id,
    course_id: lesson.course_id,
    order: lesson.order,
    difficulty: lesson.difficulty,
    lesson_type: lesson.lesson_type ?? "coding",
    content_markdown: lesson.content_markdown ?? "",
    starter_files: resolveStarterFiles(lesson),
    checkpoints: lesson.checkpoints ?? [],
    libraries: lesson.libraries ?? [],
    xp_reward: lesson.xp_reward,
    time_limit: clampInteger(lesson.time_limit, LIMITS.timeLimitMinutes),
    quiz_passing_score: lesson.quiz_passing_score ?? DEFAULT_QUIZ_PASSING_SCORE,
  }
}

/** Inteiro dentro dos limites; valores não numéricos viram o mínimo. */
function clampInteger(value: number, { min, max }: { min: number; max: number }): number {
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)))
}

/** Monta o corpo completo aceito por `POST /lessons`. */
export function toLessonInput(form: LessonFormState, testCases: TestCase[]): LessonInput {
  const files = form.starter_files.length ? form.starter_files : [{ path: MAIN_FILE_PATH, content: "" }]
  const mainFile = files.find((file) => file.path === MAIN_FILE_PATH) ?? files[0]
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    module: form.module.trim(),
    module_id: form.module_id,
    course_id: form.course_id,
    order: clampInteger(form.order, LIMITS.order),
    difficulty: form.difficulty,
    lesson_type: form.lesson_type,
    content_markdown: form.content_markdown,
    // starter_code espelha o main.py (compatibilidade com telas antigas)
    starter_code: mainFile.content,
    starter_files: files,
    checkpoints: form.checkpoints.map(({ id, instruction, hint }) => {
      const trimmedHint = hint?.trim()
      return trimmedHint ? { id, instruction, hint: trimmedHint } : { id, instruction }
    }),
    libraries: form.libraries,
    xp_reward: clampInteger(form.xp_reward, LIMITS.xpReward),
    time_limit: clampInteger(form.time_limit, LIMITS.timeLimitMinutes),
    quiz_passing_score: clampInteger(form.quiz_passing_score, LIMITS.quizPassingScore),
    test_cases: testCases,
  }
}

/** Só os campos que mudaram (para o PATCH não sobrescrever o que não foi tocado). */
export function diffLessonInput(before: LessonInput, after: LessonInput): LessonUpdateInput {
  return diffChangedFields(before, after)
}

/** Primeira mensagem de erro do formulário (antes de chamar a API) ou null. */
export function validateLessonForm(form: LessonFormState): string | null {
  const title = form.title.trim()
  if (title.length < MIN_TITLE_LENGTH) return "O título da lição precisa ter pelo menos 3 caracteres."
  if (title.length > MAX_TITLE_LENGTH) return "O título pode ter no máximo 160 caracteres."
  if (form.lesson_type === "coding") {
    const paths = form.starter_files.map((file) => file.path)
    if (!paths.includes(MAIN_FILE_PATH)) return "O exercício precisa de um arquivo main.py."
    if (new Set(paths).size !== paths.length) return "Há arquivos do exercício com o mesmo nome."
  }
  return null
}

export function toQuizInputs(questions: QuizQuestionFull[]): QuizQuestionInput[] {
  return questions.map((question) => ({
    prompt: question.prompt.trim(),
    options: question.options.map((option) => option.trim()),
    correct_index: question.correct_index,
    explanation: question.explanation.trim(),
  }))
}

function validateQuestion(question: QuizQuestionFull): string | null {
  if (!question.prompt.trim()) return "o enunciado é obrigatório."
  if (question.options.length < MIN_QUIZ_OPTIONS) return "são necessárias ao menos 2 alternativas."
  if (question.options.length > MAX_QUIZ_OPTIONS) return "use no máximo 8 alternativas."
  if (question.options.some((option) => !option.trim())) return "há alternativas vazias."
  if (question.correct_index < 0 || question.correct_index >= question.options.length) return "marque a alternativa correta."
  return null
}

export function validateQuiz(questions: QuizQuestionFull[]): string | null {
  if (questions.length === 0) return "Adicione pelo menos uma questão ao questionário."
  if (questions.length > MAX_QUIZ_QUESTIONS) return "O questionário pode ter no máximo 50 questões."
  for (const [index, question] of questions.entries()) {
    const problem = validateQuestion(question)
    if (problem) return `Questão ${index + 1}: ${problem}`
  }
  return null
}

const STARTER_PATH_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_\-./]+\.(py|txt|csv|json|md)$/

/** Nome de arquivo-semente aceito pela API (mesma regra de `projectPathSchema`). */
export function isValidStarterPath(path: string): boolean {
  return STARTER_PATH_PATTERN.test(path) && path.length <= MAX_STARTER_PATH_LENGTH
}
