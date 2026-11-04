import type { Agent } from "undici"
import { StudentHttp } from "./http"
import { MetricsRecorder } from "./metrics"
import type { Random } from "./rng"
import type { LoadLesson } from "./seed"
import { SessionEnded, Student, type RetryPolicy, type VerifyOutcome } from "./student"

/** Parâmetros comuns às fases. */
export interface PhaseSettings {
  origin: string
  /** Origem da API quando as chamadas não passam pela web (`--api`); null = via rewrite da web. */
  apiOrigin: string | null
  agent: Agent
  random: Random
  lessons: readonly LoadLesson[]
  courseId: string
  accountPrefix: string
  password: string
  /** Um X-Forwarded-For por aluno (redes diferentes) em vez de todos no mesmo IP (laboratório). */
  ipPerStudent: boolean
  downloadAssets: boolean
  pyodideVersion: string | null
  retry: RetryPolicy
}

/** Turma em regime: N alunos durante `simulatedMinutes` de aula, com compressão de tempo. */
export interface SteadyClassSettings extends PhaseSettings {
  students: number
  simulatedMinutes: number
  compression: number
  rampSeconds: number
}

/** Rajada: toda a turma na mesma lição clica em Verificar dentro de `windowSeconds`. */
export interface BurstSettings extends PhaseSettings {
  students: number
  lesson: LoadLesson
  windowSeconds: number
  waves: number
  pauseSeconds: number
  /** Alunos preparados (cadastro + lição aberta) em paralelo. */
  setupConcurrency: number
  /** Chamado entre a preparação e a primeira onda (ex.: ligar o monitor do servidor). */
  beforeMeasure?: () => Promise<void>
}

/** Resultado de uma fase: amostras HTTP, os Verificar e quanto durou (s reais). */
export interface PhaseResult {
  metrics: MetricsRecorder
  verifications: VerifyOutcome[]
  seconds: number
  /** Para a rajada: do início de cada onda ao último veredito (s). */
  waveMakespans: number[]
  /** Alunos que não conseguiram sessão (cadastro/login recusados). */
  failedLogins: number
}

/** Endereço privado determinístico por aluno (10.x.y.z), para o X-Forwarded-For. */
export function studentAddress(index: number): string {
  const host = index + 1
  return `10.${(host >> 16) & 255}.${(host >> 8) & 255}.${host & 255}`
}

function createStudent(settings: PhaseSettings, index: number, metrics: MetricsRecorder, signal: AbortSignal, compression: number, verifications: VerifyOutcome[]): Student {
  const http = new StudentHttp(settings.origin, settings.apiOrigin, settings.agent, metrics, settings.ipPerStudent ? studentAddress(index) : null)
  return new Student(index, `${settings.accountPrefix}-${index}@carga.levelusp.dev`, settings.password, {
    http,
    random: settings.random.fork(index + 1),
    compression,
    signal,
    downloadAssets: settings.downloadAssets,
    pyodideVersion: settings.pyodideVersion,
    retry: settings.retry,
    onVerify: (outcome) => verifications.push(outcome),
  })
}

/** Próxima lição da sequência; no fim do recorte, volta a sortear pelo peso. */
function nextLesson(lessons: readonly LoadLesson[], current: LoadLesson, random: Random): LoadLesson {
  return lessons.find((lesson) => lesson.position === current.position + 1) ?? random.weighted(lessons, (lesson) => lesson.weight)
}

/**
 * Sessão de um aluno numa aula: cadastro, painel, catálogo, curso (matrícula) e, lição após
 * lição, ler o enunciado, programar (autosave), Verificar até passar e, às vezes, anotar,
 * olhar o ranking ou voltar ao painel. Tempos em segundos de AULA (divididos pela compressão).
 */
async function classSession(student: Student, settings: SteadyClassSettings, random: Random): Promise<boolean> {
  if (!(await student.signUp())) return false
  await student.open("dashboard")
  await student.think(random.between(10, 30))
  await student.open("cursos")
  await student.think(random.between(5, 15))
  await student.enroll(settings.courseId)
  await student.open("curso")
  await student.think(random.between(10, 20))
  let lesson = random.weighted(settings.lessons, (candidate) => candidate.weight)
  for (;;) {
    await student.open("licao", lesson.id)
    await student.think(random.between(60, 180))
    for (let attempt = 1; attempt <= 6; attempt++) {
      const codingSeconds = attempt === 1 ? random.between(90, 300) : random.between(30, 120)
      for (let coded = 0; coded < codingSeconds; ) {
        const pause = Math.min(random.exponential(20), codingSeconds - coded)
        await student.think(pause)
        coded += pause
        await student.autosave(lesson, lesson.starter)
      }
      const outcome = await student.verify(lesson, student.chooseCode(lesson, attempt))
      await student.think(random.between(10, 30))
      if (outcome.passed) break
    }
    if (random.chance(0.15)) {
      await student.writeNote(lesson)
      await student.open("notas")
      await student.think(random.between(20, 60))
    }
    if (random.chance(0.2)) {
      await student.open("ranking")
      await student.think(random.between(5, 15))
    }
    if (random.chance(0.25)) {
      await student.open("dashboard")
      await student.think(random.between(5, 15))
    }
    lesson = nextLesson(settings.lessons, lesson, random)
  }
}

/**
 * Turma em regime. Os alunos chegam ao longo de `rampSeconds` (reais) e estudam até o fim de
 * `simulatedMinutes / compression` minutos reais. Com compressão C, a taxa de requisições
 * equivale à de N × C alunos numa aula em tempo real.
 */
export async function runSteadyClass(settings: SteadyClassSettings): Promise<PhaseResult> {
  const metrics = new MetricsRecorder()
  const verifications: VerifyOutcome[] = []
  const durationMs = (settings.simulatedMinutes * 60_000) / settings.compression
  const stop = new AbortController()
  const startedAt = performance.now()
  const timer = setTimeout(() => stop.abort(), durationMs)
  let failedLogins = 0
  const sessions = Array.from({ length: settings.students }, async (_unused, index) => {
    const student = createStudent(settings, index, metrics, stop.signal, settings.compression, verifications)
    const random = settings.random.fork(10_000 + index)
    try {
      await student.waitReal((settings.rampSeconds * index) / Math.max(1, settings.students))
      if (!(await classSession(student, settings, random))) failedLogins++
    } catch (error) {
      if (!(error instanceof SessionEnded)) throw error
    }
  })
  await Promise.all(sessions)
  clearTimeout(timer)
  return { metrics, verifications, seconds: (performance.now() - startedAt) / 1000, waveMakespans: [], failedLogins }
}

async function inBatches<T>(items: readonly T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  for (let start = 0; start < items.length; start += size) await Promise.all(items.slice(start, start + size).map(work))
}

/**
 * Rajada. Preparação (medida à parte): cada aluno se cadastra, matricula-se e abre a lição.
 * Medição: em cada onda, todos clicam em Verificar num instante sorteado dentro da janela,
 * com a mistura de códigos de uma 1ª tentativa (60% errados ou esqueleto).
 *
 * @returns a fase de medição; `preparation` traz as amostras da preparação.
 */
export async function runBurst(settings: BurstSettings): Promise<PhaseResult & { preparation: MetricsRecorder }> {
  const preparation = new MetricsRecorder()
  const verifications: VerifyOutcome[] = []
  const never = new AbortController()
  const students = Array.from({ length: settings.students }, (_unused, index) => createStudent(settings, index, preparation, never.signal, 1, verifications))
  let failedLogins = 0
  const ready: Student[] = []
  await inBatches(students, settings.setupConcurrency, async (student) => {
    if (!(await student.signUp())) {
      failedLogins++
      return
    }
    await student.enroll(settings.courseId)
    await student.open("licao", settings.lesson.id)
    ready.push(student)
  })
  const metrics = new MetricsRecorder()
  for (const student of ready) student.useMetrics(metrics)
  await settings.beforeMeasure?.()
  const startedAt = performance.now()
  const waveMakespans: number[] = []
  for (let wave = 0; wave < settings.waves; wave++) {
    if (wave > 0) await new Promise<void>((resolve) => setTimeout(resolve, settings.pauseSeconds * 1000))
    const waveStart = performance.now()
    await Promise.all(
      ready.map(async (student) => {
        const random = settings.random.fork(wave * 100_000 + student.index)
        await student.waitReal(random.between(0, settings.windowSeconds))
        await student.verify(settings.lesson, student.chooseCode(settings.lesson, 1))
      }),
    )
    waveMakespans.push((performance.now() - waveStart) / 1000)
  }
  return { metrics, preparation, verifications, seconds: (performance.now() - startedAt) / 1000, waveMakespans, failedLogins }
}
