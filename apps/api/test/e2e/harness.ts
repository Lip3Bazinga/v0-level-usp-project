import { Test } from "@nestjs/testing"
import type { NestExpressApplication } from "@nestjs/platform-express"
import type { INestApplication } from "@nestjs/common"
import type { QueryResultRow } from "pg"
import request from "supertest"
import { eq, sql, type SQL } from "drizzle-orm"
import { lessons, profiles, type LessonInsert, type LessonRow } from "@levelusp/db"
import type { ProbeObservation, RunnerJob, RunnerResult, UserRole } from "@levelusp/contracts"
import { AppModule } from "@/app.module"
import { configureApp } from "@/bootstrap"
import { requireRow } from "@/common/database/rows"
import { DB, type Database } from "@/infra/database/database.module"
import { MailService, type MailMessage } from "@/infra/mail/mail.service"
import type { CodeRunner, RunnerHealthProbe } from "@/infra/runner/code-runner"
import { RunnerClient } from "@/infra/runner/runner.client"
import { TEST_DATABASE_URL } from "./global-setup"

export const TEST_PASSWORD = "senhaForte123"
/** Nome do cabeçalho como o front envia: fixado aqui de propósito, para o teste pegar uma mudança na API. */
export const CSRF_HEADER_NAME = "x-levelusp-csrf"

type Responder = (job: RunnerJob) => ProbeObservation[]

/** Executor falso: cada teste define que observações o "sandbox" devolve. */
export class FakeRunner implements CodeRunner, RunnerHealthProbe {
  jobs: RunnerJob[] = []
  private responder: Responder = (job) => job.probes.map((probe) => ({ id: probe.id, ok: true }))

  respond(responder: Responder) {
    this.responder = responder
  }

  async run(job: RunnerJob): Promise<RunnerResult> {
    this.jobs.push(job)
    return { observations: this.responder(job), engine: { python: "fake", runtime: "fake" }, durationMs: 1 }
  }

  async healthy() {
    return true
  }
}

export class FakeMail {
  sent: MailMessage[] = []
  private failure: Error | null = null

  /** Simula o SMTP fora do ar (já depois das novas tentativas) até `reset()`. */
  failWith(error: Error): void {
    this.failure = error
  }

  async send(message: MailMessage): Promise<void> {
    if (this.failure) throw this.failure
    this.sent.push(message)
  }

  reset(): void {
    this.sent = []
    this.failure = null
  }
}

export interface TestContext {
  app: INestApplication
  db: Database
  runner: FakeRunner
  mail: FakeMail
  close: () => Promise<void>
  reset: () => Promise<void>
}

export async function createTestApp(env: Record<string, string> = {}): Promise<TestContext> {
  Object.assign(process.env, {
    APP_ENV: "test",
    NODE_ENV: "test",
    DATABASE_URL: TEST_DATABASE_URL,
    RUNNER_TOKEN: "test-runner-token-0123456789",
    LOG_LEVEL: "warn",
    UPLOAD_DIR: "/tmp/levelusp-test-uploads",
    SWAGGER_ENABLED: "false",
    TRUST_PROXY: "false",
    AUTH_THROTTLE_LIMIT: "1000",
    // Vazio = não definido: cada suíte escolhe a origem pública que quer provar.
    PUBLIC_BASE_URL: "",
    APP_ORIGIN: "",
    ...env,
  })
  const runner = new FakeRunner()
  const mail = new FakeMail()
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RunnerClient)
    .useValue(runner)
    .overrideProvider(MailService)
    .useValue(mail)
    .compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false })
  configureApp(app, { useLogger: false })
  await app.init()
  const db = app.get<Database>(DB)
  return {
    app,
    db,
    runner,
    mail,
    close: () => app.close(),
    reset: async () => {
      await db.execute(sql`
        truncate users, sessions, password_reset_tokens, oauth_accounts, profiles, modules, courses, lessons,
          lesson_quiz_questions, enrollments, lesson_progress, submissions, notes, badges, user_badges, exams,
          exam_questions, exam_attempts, certificates, notifications, audit_log, platform_settings,
          teacher_approvals, library_catalog, library_requests, uploads cascade`)
      runner.jobs = []
      mail.reset()
    },
  }
}

/** Agente HTTP com cookies e o cabeçalho anti-CSRF que o front envia. */
export function agent(app: INestApplication) {
  const httpAgent = request.agent(app.getHttpServer())
  return {
    raw: httpAgent,
    get: (url: string) => httpAgent.get(url),
    post: (url: string, body?: object) => httpAgent.post(url).set(CSRF_HEADER_NAME, "1").send(body ?? {}),
    put: (url: string, body?: object) => httpAgent.put(url).set(CSRF_HEADER_NAME, "1").send(body ?? {}),
    patch: (url: string, body?: object) => httpAgent.patch(url).set(CSRF_HEADER_NAME, "1").send(body ?? {}),
    delete: (url: string) => httpAgent.delete(url).set(CSRF_HEADER_NAME, "1"),
  }
}
export type Agent = ReturnType<typeof agent>

let signUpCounter = 0
export async function signUp(app: INestApplication, role: UserRole = "student", db?: Database) {
  const userAgent = agent(app)
  const email = `user${++signUpCounter}_${Date.now()}@usp.br`
  const response = await userAgent.post("/api/auth/sign-up", { email, password: TEST_PASSWORD, full_name: `Usuário ${signUpCounter}` })
  if (response.status !== 201) throw new Error(`sign-up falhou: ${response.status} ${JSON.stringify(response.body)}`)
  const id: string = response.body.user.id
  if (role !== "student" && db) await db.update(profiles).set({ role }).where(eq(profiles.id, id))
  return { agent: userAgent, id, email, password: TEST_PASSWORD }
}

export async function createLesson(db: Database, values: Partial<LessonInsert> = {}): Promise<LessonRow> {
  const inserted = await db
    .insert(lessons)
    .values({ title: "Lição de teste", published: true, xpReward: 50, lessonType: "coding", testCases: [], ...values })
    .returning()
  return requireRow(inserted, "lessons")
}

/** Linhas de uma consulta SQL crua, com o formato que o teste espera. */
export async function queryRows<Row extends QueryResultRow>(db: Database, query: SQL) {
  const result = await db.execute<Row>(query)
  return result.rows
}

/** Para consultas `select count(*)::int as n ...`. */
export async function countRows(db: Database, query: SQL): Promise<number> {
  const [counted] = await queryRows<{ n: number }>(db, query)
  return counted?.n ?? 0
}

/** Falha o teste com mensagem clara quando um item esperado não existe. */
export function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`esperava ${what}`)
  return value
}
