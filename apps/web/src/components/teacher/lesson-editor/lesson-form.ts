import type {
  Checkpoint, Difficulty, LessonInput, LessonType, LessonUpdateInput, LessonWithTests, ProjectFile, QuizQuestionFull,
  QuizQuestionInput, TestCase,
} from "@levelusp/contracts"
import { resolveStarterFiles } from "@/lib/api/learning"

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
  starter_files: [{ path: "main.py", content: DEFAULT_STARTER }],
  checkpoints: [],
  libraries: [],
  xp_reward: 50,
  time_limit: 10,
  quiz_passing_score: 70,
}

export function formFromLesson(l: LessonWithTests): LessonFormState {
  return {
    title: l.title,
    description: l.description ?? "",
    module: l.module ?? "",
    module_id: l.module_id,
    course_id: l.course_id,
    order: l.order,
    difficulty: l.difficulty,
    lesson_type: l.lesson_type ?? "coding",
    content_markdown: l.content_markdown ?? "",
    starter_files: resolveStarterFiles(l),
    checkpoints: l.checkpoints ?? [],
    libraries: l.libraries ?? [],
    xp_reward: l.xp_reward,
    time_limit: clamp(l.time_limit, 1, 300),
    quiz_passing_score: l.quiz_passing_score ?? 70,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)))
}

/** Monta o corpo completo aceito por `POST /lessons`. */
export function toLessonInput(f: LessonFormState, testCases: TestCase[]): LessonInput {
  const files = f.starter_files.length ? f.starter_files : [{ path: "main.py", content: "" }]
  const main = files.find((x) => x.path === "main.py") ?? files[0]!
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    module: f.module.trim(),
    module_id: f.module_id,
    course_id: f.course_id,
    order: clamp(f.order, 1, 10_000),
    difficulty: f.difficulty,
    lesson_type: f.lesson_type,
    content_markdown: f.content_markdown,
    // starter_code espelha o main.py (compatibilidade com telas antigas)
    starter_code: main.content,
    starter_files: files,
    checkpoints: f.checkpoints.map((c) => {
      const hint = c.hint?.trim()
      return hint ? { id: c.id, instruction: c.instruction, hint } : { id: c.id, instruction: c.instruction }
    }),
    libraries: f.libraries,
    xp_reward: clamp(f.xp_reward, 0, 5000),
    time_limit: clamp(f.time_limit, 1, 300),
    quiz_passing_score: clamp(f.quiz_passing_score, 1, 100),
    test_cases: testCases,
  }
}

/** Só os campos que mudaram (para o PATCH não sobrescrever o que não foi tocado). */
export function diffLessonInput(before: LessonInput, after: LessonInput): LessonUpdateInput {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof LessonInput)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) patch[key] = after[key]
  }
  return patch as LessonUpdateInput
}

/** Primeira mensagem de erro do formulário (antes de chamar a API) ou null. */
export function validateLessonForm(f: LessonFormState): string | null {
  if (f.title.trim().length < 3) return "O título da lição precisa ter pelo menos 3 caracteres."
  if (f.title.trim().length > 160) return "O título pode ter no máximo 160 caracteres."
  if (f.lesson_type === "coding") {
    const paths = f.starter_files.map((x) => x.path)
    if (!paths.includes("main.py")) return "O exercício precisa de um arquivo main.py."
    if (new Set(paths).size !== paths.length) return "Há arquivos do exercício com o mesmo nome."
  }
  return null
}

// ── Questionário ─────────────────────────────────────────────────────────────

export function toQuizInputs(questions: QuizQuestionFull[]): QuizQuestionInput[] {
  return questions.map((q) => ({
    prompt: q.prompt.trim(),
    options: q.options.map((o) => o.trim()),
    correct_index: q.correct_index,
    explanation: q.explanation.trim(),
  }))
}

export function validateQuiz(questions: QuizQuestionFull[]): string | null {
  if (questions.length === 0) return "Adicione pelo menos uma questão ao questionário."
  if (questions.length > 50) return "O questionário pode ter no máximo 50 questões."
  for (const [i, q] of questions.entries()) {
    if (!q.prompt.trim()) return `Questão ${i + 1}: o enunciado é obrigatório.`
    if (q.options.length < 2) return `Questão ${i + 1}: são necessárias ao menos 2 alternativas.`
    if (q.options.length > 8) return `Questão ${i + 1}: use no máximo 8 alternativas.`
    if (q.options.some((o) => !o.trim())) return `Questão ${i + 1}: há alternativas vazias.`
    if (q.correct_index < 0 || q.correct_index >= q.options.length) return `Questão ${i + 1}: marque a alternativa correta.`
  }
  return null
}

/** Nome de arquivo-semente aceito pela API (mesma regra de `projectPathSchema`). */
export function isValidStarterPath(path: string): boolean {
  return /^(?!\/)(?!.*\.\.)[A-Za-z0-9_\-./]+\.(py|txt|csv|json|md)$/.test(path) && path.length <= 200
}
