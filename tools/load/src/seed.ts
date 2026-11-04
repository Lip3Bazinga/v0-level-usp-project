import { readFileSync } from "node:fs"
import path from "node:path"

/** Arquivo de projeto enviado no Verificar. */
export interface ProjectFile {
  path: string
  content: string
}

/** Lição do seed `python-completo.json` (só o que a carga usa). */
export interface SeedLesson {
  order: number
  title: string
  starter_files: ProjectFile[]
  reference_solution: ProjectFile[]
  wrong_solutions: { name: string; files: ProjectFile[] }[]
}

/** Lição pronta para a carga: id no banco + os códigos que os alunos enviam. */
export interface LoadLesson {
  id: string
  /** Posição no curso (1 = primeira lição). */
  position: number
  title: string
  starter: ProjectFile[]
  reference: ProjectFile[]
  wrong: ProjectFile[][]
  /** Peso relativo na escolha da lição em que o aluno começa. */
  weight: number
}

/** Caminho padrão do seed, relativo a este pacote. */
export const DEFAULT_SEED_PATH = path.resolve(import.meta.dirname, "../../../packages/db/seed/python-completo.json")

/**
 * Lê as lições do seed.
 *
 * @throws Error se o arquivo não tiver a lista `lessons` com código de referência.
 */
export function readSeedLessons(file: string = DEFAULT_SEED_PATH): SeedLesson[] {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"))
  if (typeof parsed !== "object" || parsed === null || !("lessons" in parsed) || !Array.isArray(parsed.lessons)) {
    throw new Error(`Seed sem "lessons": ${file}`)
  }
  const lessons = parsed.lessons as SeedLesson[]
  for (const lesson of lessons) {
    if (!Array.isArray(lesson.reference_solution) || !Array.isArray(lesson.starter_files)) {
      throw new Error(`Lição "${String(lesson.title)}" do seed sem solução de referência ou esqueleto`)
    }
  }
  return lessons
}

/** Lição como a API devolve em `GET /courses/:id/lessons` (só os campos usados aqui). */
export interface ApiLesson {
  id: string
  title: string
  order: number
  lesson_type: string
}

/**
 * Peso de uma lição na escolha do ponto de partida do aluno: numa aula, a turma está quase
 * toda nas primeiras lições (fundamentos) e poucos chegam às últimas. Decai pela metade a
 * cada `halfLife` posições.
 */
export function lessonWeight(position: number, halfLife = 4): number {
  return 0.5 ** ((position - 1) / halfLife)
}

/**
 * Junta as lições do seed com as da API pelo título (o seed não guarda ids) e mantém a
 * ordem do curso. Lições sem par no seed (teoria, quiz) ficam de fora.
 *
 * @param range posições do curso permitidas (inclusive), ex.: `[1, 8]`.
 */
export function matchLessons(seed: readonly SeedLesson[], api: readonly ApiLesson[], range: readonly [number, number] = [1, Number.MAX_SAFE_INTEGER]): LoadLesson[] {
  const seedByTitle = new Map(seed.map((lesson) => [lesson.title, lesson]))
  const coding = [...api].filter((lesson) => lesson.lesson_type === "coding").sort((a, b) => a.order - b.order)
  return coding.flatMap((lesson, index) => {
    const position = index + 1
    const match = seedByTitle.get(lesson.title)
    if (!match || position < range[0] || position > range[1]) return []
    return [{
      id: lesson.id,
      position,
      title: lesson.title,
      starter: match.starter_files,
      reference: match.reference_solution,
      wrong: match.wrong_solutions.map((wrong) => wrong.files),
      weight: lessonWeight(position),
    }]
  })
}

/** Que código o aluno manda numa tentativa. */
export type AttemptKind = "reference" | "wrong" | "starter"

/**
 * Probabilidade de a tentativa estar errada: começa alta e cai a cada tentativa (o aluno
 * lê o retorno e corrige). Na 1ª, 60% erram (45% com uma solução plausível errada, 15%
 * mandando o esqueleto quase sem mexer).
 */
export function attemptKind(attempt: number, roll: number): AttemptKind {
  const wrongProbability = [0.6, 0.4, 0.25][attempt - 1] ?? 0.1
  if (roll >= wrongProbability) return "reference"
  const starterShare = attempt === 1 ? 0.25 : 0
  return roll < wrongProbability * starterShare ? "starter" : "wrong"
}
