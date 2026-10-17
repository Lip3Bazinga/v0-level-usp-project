import { Test } from "@nestjs/testing"
import type { NestExpressApplication } from "@nestjs/platform-express"
import type { INestApplication } from "@nestjs/common"
import request from "supertest"
import { sql } from "drizzle-orm"
import { lessons, profiles } from "@levelusp/db"
import type { ProbeObservation, RunnerJob, RunnerResult, TestCase } from "@levelusp/contracts"
import { AppModule } from "@/app.module"
import { configureApp } from "@/bootstrap"
import { DB, type Database } from "@/infra/database/database.module"
import { MailService, type MailMessage } from "@/infra/mail/mail.service"
import { RunnerClient } from "@/infra/runner/runner.client"
import { TEST_DATABASE_URL } from "./global-setup"

/** Executor falso: cada teste define que observações o "sandbox" devolve. */
export class FakeRunner {
  jobs: RunnerJob[] = []
  private responder: (job: RunnerJob) => ProbeObservation[] = (job) => job.probes.map((p) => ({ id: p.id, ok: true }))

  respond(fn: (job: RunnerJob) => ProbeObservation[]) {
    this.responder = fn
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
  async send(m: MailMessage) {
    this.sent.push(m)
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
      mail.sent = []
    },
  }
}

/** Agente HTTP com cookies e o cabeçalho anti-CSRF que o front envia. */
export function agent(app: INestApplication) {
  const a = request.agent(app.getHttpServer())
  return {
    raw: a,
    get: (url: string) => a.get(url),
    post: (url: string, body?: object) => a.post(url).set("x-levelusp-csrf", "1").send(body ?? {}),
    put: (url: string, body?: object) => a.put(url).set("x-levelusp-csrf", "1").send(body ?? {}),
    patch: (url: string, body?: object) => a.patch(url).set("x-levelusp-csrf", "1").send(body ?? {}),
    delete: (url: string) => a.delete(url).set("x-levelusp-csrf", "1"),
  }
}
export type Agent = ReturnType<typeof agent>

let counter = 0
export async function signUp(app: INestApplication, role: "student" | "teacher" | "admin" = "student", db?: Database) {
  const a = agent(app)
  const email = `user${++counter}_${Date.now()}@usp.br`
  const res = await a.post("/api/auth/sign-up", { email, password: "senhaForte123", full_name: `Usuário ${counter}` })
  if (res.status !== 201) throw new Error(`sign-up falhou: ${res.status} ${JSON.stringify(res.body)}`)
  const id = res.body.user.id as string
  if (role !== "student" && db) await db.update(profiles).set({ role }).where(sql`${profiles.id} = ${id}`)
  return { agent: a, id, email, password: "senhaForte123" }
}

export async function createLesson(db: Database, data: Partial<typeof lessons.$inferInsert> & { testCases?: TestCase[] } = {}) {
  const [row] = await db
    .insert(lessons)
    .values({ title: "Lição de teste", published: true, xpReward: 50, lessonType: "coding", testCases: [], ...data })
    .returning()
  return row!
}
