import { setTimeout as sleep } from "node:timers/promises"
import type { StudentHttp } from "./http"
import type { MetricsRecorder } from "./metrics"
import { AFTER_COMPLETION_CALLS, fillRoute, PAGES, PROVIDER_CALLS, type PageName, type RouteIds } from "./pages"
import type { Random } from "./rng"
import { attemptKind, type AttemptKind, type LoadLesson, type ProjectFile } from "./seed"

/** Arquivos do núcleo do Pyodide que o navegador baixa ao abrir a primeira lição. */
export const PYODIDE_FILES: readonly string[] = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]

const SCRIPT_OR_STYLE_PATTERN = /(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g
const SUBMISSION_LABEL = "POST /api/lessons/:id/submissions (Verificar)"

/** Resultado de um Verificar do ponto de vista do aluno. */
export interface VerifyOutcome {
  kind: AttemptKind
  status: number
  code?: string
  ms: number
  passed: boolean
  /** Tempo no executor informado pela API (`durationMs`), quando corrigiu. */
  runnerMs: number | null
  /** Reenvios depois de "corretor ocupado" (503) ou de limite (429). */
  retries: number
  /** Do primeiro clique ao veredito (inclui as esperas entre reenvios). */
  totalMs: number
}

/** Como o aluno reage a "corretor ocupado": quantas vezes insiste e quanto espera (s reais). */
export interface RetryPolicy {
  maxRetries: number
  minWaitSeconds: number
  maxWaitSeconds: number
}

/** O que o aluno precisa da simulação: relógio comprimido, sorteios e opções de download. */
export interface StudentContext {
  http: StudentHttp
  random: Random
  /** Fator de compressão do tempo de pensar (10 = 10× mais rápido que uma aula real). */
  compression: number
  /** Encerra os tempos de pensar quando a fase acaba. */
  signal: AbortSignal
  downloadAssets: boolean
  /** Versão do Pyodide em `/pyodide/v<versão>/`; null = não baixa o Pyodide. */
  pyodideVersion: string | null
  retry: RetryPolicy
  onVerify: (outcome: VerifyOutcome) => void
}

interface SessionResponse {
  user: { id: string }
}

interface SubmissionResponse {
  allPassed: boolean
  durationMs: number
}

/** Fase acabou no meio de uma espera: a sessão do aluno termina ali. */
export class SessionEnded extends Error {}

/**
 * Um aluno virtual: cadastra-se, navega como o front navega (mesmas chamadas, carregamento
 * completo só na primeira tela), edita com autosave, faz anotações, olha o ranking e
 * Verifica com códigos do seed (errados no começo, a referência depois).
 */
export class Student {
  private userId: string | null = null
  private courseId: string | null = null
  private readonly downloaded = new Set<string>()
  private hasLoadedApp = false
  private pyodideLoaded = false

  constructor(
    readonly index: number,
    private readonly email: string,
    private readonly password: string,
    private readonly context: StudentContext,
  ) {}

  /** Passa a registrar as requisições em outro coletor (ex.: da preparação para a medição). */
  useMetrics(metrics: MetricsRecorder): void {
    this.context.http.useMetrics(metrics)
  }

  /** Espera `simulatedSeconds` de aula (divididos pela compressão). */
  async think(simulatedSeconds: number): Promise<void> {
    try {
      await sleep((simulatedSeconds * 1000) / this.context.compression, undefined, { signal: this.context.signal })
    } catch {
      throw new SessionEnded()
    }
  }

  /**
   * Abre `/signup` e cria a conta (ou entra, se a conta já existe).
   *
   * @returns falso se não conseguiu sessão (cadastro e login recusados).
   */
  async signUp(): Promise<boolean> {
    await this.fetchDocument("/signup")
    const created = await this.context.http.send<SessionResponse>("POST", "/api/auth/sign-up", {
      body: { email: this.email, password: this.password, full_name: `Aluno Carga ${this.index}` },
      json: true,
    })
    if (created.status === 201 && created.body) {
      this.userId = created.body.user.id
      return true
    }
    return this.signIn()
  }

  /** Entra com a conta já criada. */
  async signIn(): Promise<boolean> {
    const session = await this.context.http.send<SessionResponse>("POST", "/api/auth/sign-in", { body: { email: this.email, password: this.password }, json: true })
    if (session.status !== 200 || !session.body) return false
    this.userId = session.body.user.id
    return true
  }

  /** Matricula-se no curso (idempotente na API). */
  async enroll(courseId: string): Promise<void> {
    this.courseId = courseId
    await this.context.http.send("POST", `/api/courses/${courseId}/enrollment`)
  }

  /**
   * Abre uma tela. A primeira tela da sessão é um carregamento completo (HTML, JS/CSS e os
   * contextos globais); as seguintes são navegação no cliente (payload RSC + chamadas da tela).
   */
  async open(page: PageName, lessonId?: string): Promise<void> {
    const ids: RouteIds = { ...(this.userId ? { user: this.userId } : {}), ...(this.courseId ? { course: this.courseId } : {}), ...(lessonId ? { lesson: lessonId } : {}) }
    const spec = PAGES[page]
    const path = fillRoute(spec.path, ids)
    const calls = spec.calls.map((call) => fillRoute(call, ids))
    if (this.hasLoadedApp) {
      // Navegação no cliente: payload RSC da rota. Sem os cabeçalhos de estado do roteador, o
      // Next 16 exige `_rsc` vazio (com outro valor ele redireciona com 307).
      const rsc = this.context.http.send("GET", `${path}?_rsc=`, { headers: { rsc: "1" }, label: `GET ${spec.path} (RSC)` })
      await Promise.all([rsc, ...calls.map((call) => this.context.http.send("GET", call))])
    } else {
      this.hasLoadedApp = true
      await this.fetchDocument(path, spec.path)
      await Promise.all([...PROVIDER_CALLS, ...calls].map((call) => this.context.http.send("GET", fillRoute(call, ids))))
    }
    if (page === "licao") await this.loadPyodide()
  }

  /** Autosave do editor (`PUT /lessons/:id/snapshot`, 1,5 s depois da última tecla). */
  async autosave(lesson: LoadLesson, files: readonly ProjectFile[]): Promise<void> {
    await this.context.http.send("PUT", `/api/lessons/${lesson.id}/snapshot`, { body: { files } })
  }

  /** Cria uma anotação ligada à lição e abre a tela de notas. */
  async writeNote(lesson: LoadLesson): Promise<void> {
    const content = `<p>Resumo da lição ${lesson.title}: ${"anotação de estudo ".repeat(20)}</p>`
    await this.context.http.send("POST", "/api/me/notes", { body: { title: `Notas — ${lesson.title}`, content, lesson_id: lesson.id } })
  }

  /** Código que o aluno manda nesta tentativa (sorteado conforme a tentativa). */
  chooseCode(lesson: LoadLesson, attempt: number): { kind: AttemptKind; files: ProjectFile[] } {
    const kind = attemptKind(attempt, this.context.random.next())
    if (kind === "starter") return { kind, files: lesson.starter }
    if (kind === "wrong" && lesson.wrong.length > 0) return { kind, files: this.context.random.pick(lesson.wrong) }
    return { kind: "reference", files: lesson.reference }
  }

  /**
   * Clica em Verificar. Se o corretor estiver ocupado (503) ou o limite estourar (429), insiste
   * como um aluno faria, até `retry.maxRetries` vezes. Aprovado → o front atualiza perfil,
   * progresso e notificações.
   */
  async verify(lesson: LoadLesson, code: { kind: AttemptKind; files: ProjectFile[] }): Promise<VerifyOutcome> {
    const clickedAt = performance.now()
    let retries = 0
    for (;;) {
      const result = await this.context.http.send<SubmissionResponse>("POST", `/api/lessons/${lesson.id}/submissions`, { body: { files: code.files }, json: true, label: SUBMISSION_LABEL })
      const shouldRetry = (result.status === 503 || result.status === 429 || result.status === 0) && retries < this.context.retry.maxRetries
      if (shouldRetry) {
        retries++
        await this.waitReal(retryWaitSeconds(result.retryAfterSeconds, this.context.retry, this.context.random))
        continue
      }
      const passed = result.status === 200 && result.body?.allPassed === true
      const outcome: VerifyOutcome = {
        kind: code.kind,
        status: result.status,
        ms: result.ms,
        passed,
        runnerMs: result.body?.durationMs ?? null,
        retries,
        totalMs: performance.now() - clickedAt,
        ...(result.code ? { code: result.code } : {}),
      }
      this.context.onVerify(outcome)
      if (passed) await this.refreshAfterCompletion()
      return outcome
    }
  }

  private async refreshAfterCompletion(): Promise<void> {
    await Promise.all(AFTER_COMPLETION_CALLS.map((call) => this.context.http.send("GET", call)))
  }

  /** HTML da tela e, uma vez por sessão (cache do navegador), os JS/CSS que ela referencia. */
  private async fetchDocument(path: string, label: string = path): Promise<void> {
    const page = await this.context.http.send<never>("GET", path, { label: `GET ${label} (HTML)`, headers: { accept: "text/html" }, text: this.context.downloadAssets })
    if (page.text !== null && page.status === 200) await this.downloadStatic(extractStaticAssets(page.text))
  }

  /** Baixa os JS/CSS ainda não baixados nesta sessão (o navegador guarda em cache). */
  private async downloadStatic(assets: readonly string[]): Promise<void> {
    const missing = assets.filter((asset) => !this.downloaded.has(asset))
    for (const asset of missing) this.downloaded.add(asset)
    await Promise.all(missing.map((asset) => this.context.http.send("GET", asset)))
  }

  private async loadPyodide(): Promise<void> {
    const version = this.context.pyodideVersion
    if (this.pyodideLoaded || version === null) return
    this.pyodideLoaded = true
    await Promise.all(PYODIDE_FILES.map((file) => this.context.http.send("GET", `/pyodide/v${version}/${file}`)))
  }

  /** Espera, em segundos reais, antes de um evento combinado (ex.: o clique da rajada). */
  async waitReal(seconds: number): Promise<void> {
    try {
      await sleep(seconds * 1000, undefined, { signal: this.context.signal })
    } catch {
      throw new SessionEnded()
    }
  }
}

/** Teto da espera antes de insistir, mesmo que o servidor sugira mais (o aluno desiste antes). */
const MAX_RETRY_WAIT_SECONDS = 60

/**
 * Quanto o aluno espera antes de clicar de novo: o que a mensagem pediu (`Retry-After`) mais um
 * atraso humano de até `minWaitSeconds`; sem sugestão, um tempo entre `minWaitSeconds` e
 * `maxWaitSeconds`.
 */
export function retryWaitSeconds(retryAfterSeconds: number | undefined, policy: RetryPolicy, random: Random): number {
  if (retryAfterSeconds === undefined) return random.between(policy.minWaitSeconds, policy.maxWaitSeconds)
  return Math.min(MAX_RETRY_WAIT_SECONDS, retryAfterSeconds + random.between(0, policy.minWaitSeconds))
}

/** Extrai os JS/CSS de `/_next/static/` referenciados num HTML (sem repetição). */
export function extractStaticAssets(html: string): string[] {
  return [...new Set([...html.matchAll(SCRIPT_OR_STYLE_PATTERN)].map((match) => match[1] ?? ""))].filter(Boolean)
}
