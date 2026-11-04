/**
 * Apoio da suíte de ataques (`test/security`): descoberta das rotas registradas
 * no Express (a matriz de autorização cobre rotas novas sem edição manual),
 * fixtures com dois donos para BOLA/IDOR e cargas maliciosas reutilizadas.
 */
import type { INestApplication } from "@nestjs/common"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { courses, exams, examQuestions, lessonQuizQuestions, notes, notifications, teacherApprovals, libraryRequests, type CourseRow } from "@levelusp/db"
import type { IoCase } from "@levelusp/contracts"
import { requireRow } from "@/common/database/rows"
import { agent, createLesson, signUp, type SignedUpUser, type TestContext } from "../e2e/harness"

/** Rota HTTP como o Express a registrou (`/api/courses/:id`). */
export interface RegisteredRoute {
  method: string
  path: string
}

const routerStackSchema = z.array(
    z.object({
      route: z.object({ path: z.string(), methods: z.record(z.string(), z.boolean()) }).optional(),
    }),
)

/**
 * Lê as rotas direto do roteador do Express depois do `app.init()`: é a fonte
 * da verdade do que está exposto, inclusive rotas que ninguém documentou.
 */
export function listRegisteredRoutes(app: INestApplication): RegisteredRoute[] {
  const instance: unknown = app.getHttpAdapter().getInstance()
  if (typeof instance !== "function") throw new Error("instância do Express inesperada")
  // O roteador do Express 5 também é uma função; a pilha de camadas fica em `router.stack`.
  const router: unknown = Reflect.get(instance, "router")
  if (typeof router !== "function") throw new Error("roteador do Express inesperado")
  const stack = routerStackSchema.parse(Reflect.get(router, "stack"))
  const routes: RegisteredRoute[] = []
  for (const layer of stack) {
    if (!layer.route) continue
    for (const [method, isEnabled] of Object.entries(layer.route.methods)) {
      if (isEnabled && method !== "_all") routes.push({ method: method.toUpperCase(), path: layer.route.path })
    }
  }
  return routes
}

/** Chave estável da rota na matriz (`GET /api/courses/:id`). */
export function routeKey(route: RegisteredRoute): string {
  return `${route.method} ${route.path}`
}

/** Troca cada `:param` por um valor bem formado (UUID inexistente, código, nome de arquivo). */
export function concretePath(path: string): string {
  return path
    .replace(/:code\b/g, "LVL-AAAA-BBBB")
    .replace(/:name\b/g, "00000000-0000-4000-8000-000000000000.png")
    .replace(/:username\b/g, "ninguem")
    .replace(/:[A-Za-z]+/g, "00000000-0000-4000-8000-000000000000")
}

/** Valor que só existe no gabarito: se aparecer numa resposta ao aluno, vazou. */
export const SECRET_EXPECTED = "SEGREDO-DO-GABARITO"
const SECRET_CASE: IoCase = { id: "c1", kind: "io", stdin: "", expected_stdout: SECRET_EXPECTED, match: "trimmed" }

/** Dois professores, dois alunos e um admin, cada um com sessão própria. */
export interface Cast {
  teacherA: SignedUpUser
  teacherB: SignedUpUser
  studentA: SignedUpUser
  studentB: SignedUpUser
  admin: SignedUpUser
}

/** Cria o elenco padrão dos testes de autorização. */
export async function createCast(ctx: TestContext): Promise<Cast> {
  return {
    teacherA: await signUp(ctx.app, "teacher", ctx.db),
    teacherB: await signUp(ctx.app, "teacher", ctx.db),
    studentA: await signUp(ctx.app),
    studentB: await signUp(ctx.app),
    admin: await signUp(ctx.app, "admin", ctx.db),
  }
}

/** Recursos de um dono (professor e aluno "A") para atacar com o usuário "B". */
export interface OwnedResources {
  draftCourse: CourseRow
  publishedCourse: CourseRow
  draftLessonId: string
  publishedLessonId: string
  quizLessonId: string
  noteId: string
  notificationId: string
  teacherApprovalId: string
  libraryRequestId: string
  examId: string
  examQuestionId: string
}

/** Semeia recursos do professor A e do aluno A. */
export async function seedOwnedResources(ctx: TestContext, cast: Cast): Promise<OwnedResources> {
  const draftCourse = requireRow(await ctx.db.insert(courses).values({ title: "Rascunho de A", published: false, createdBy: cast.teacherA.id }).returning(), "courses")
  const publishedCourse = requireRow(await ctx.db.insert(courses).values({ title: "Curso de A", published: true, createdBy: cast.teacherA.id }).returning(), "courses")
  const draftLesson = await createLesson(ctx.db, { title: "Rascunho", published: false, createdBy: cast.teacherA.id, courseId: draftCourse.id, testCases: [SECRET_CASE] })
  const publishedLesson = await createLesson(ctx.db, {
    title: "Publicada",
    published: true,
    createdBy: cast.teacherA.id,
    courseId: publishedCourse.id,
    testCases: [SECRET_CASE],
  })
  const quizLesson = await createLesson(ctx.db, { title: "Quiz", published: true, createdBy: cast.teacherA.id, lessonType: "quiz", courseId: publishedCourse.id })
  await ctx.db.insert(lessonQuizQuestions).values({ lessonId: quizLesson.id, prompt: "2+2?", options: ["3", "4"], correctIndex: 1, explanation: "SEGREDO-DA-EXPLICACAO", sortOrder: 0 })
  const note = requireRow(await ctx.db.insert(notes).values({ userId: cast.studentA.id, title: "Privada", content: "conteúdo privado de A" }).returning(), "notes")
  const notification = requireRow(await ctx.db.insert(notifications).values({ userId: cast.studentA.id, title: "Para A", body: "" }).returning(), "notifications")
  const approval = requireRow(
    await ctx.db.insert(teacherApprovals).values({ userId: cast.studentA.id, name: "A", email: cast.studentA.email, institution: "USP", motivation: "quero ensinar" }).returning(),
    "teacher_approvals",
  )
  const libraryRequest = requireRow(await ctx.db.insert(libraryRequests).values({ requestedBy: cast.teacherA.id, libraryName: "numpy" }).returning(), "library_requests")
  const exam = requireRow(
    await ctx.db.insert(exams).values({ courseId: publishedCourse.id, title: "Prova", passingScore: 70, timeLimitMinutes: 30, cooldownMinutes: 60 }).returning(),
    "exams",
  )
  const question = requireRow(
    await ctx.db.insert(examQuestions).values({ examId: exam.id, prompt: "P?", options: ["a", "b"], correctIndex: 1, explanation: "SEGREDO-DA-EXPLICACAO", sortOrder: 0 }).returning(),
    "exam_questions",
  )
  return {
    draftCourse,
    publishedCourse,
    draftLessonId: draftLesson.id,
    publishedLessonId: publishedLesson.id,
    quizLessonId: quizLesson.id,
    noteId: note.id,
    notificationId: notification.id,
    teacherApprovalId: approval.id,
    libraryRequestId: libraryRequest.id,
    examId: exam.id,
    examQuestionId: question.id,
  }
}

/** Curso de A continua com o título original? (prova de que o ataque não alterou nada). */
export async function courseTitle(ctx: TestContext, id: string): Promise<string | undefined> {
  const row = await ctx.db.query.courses.findFirst({ where: eq(courses.id, id), columns: { title: true } })
  return row?.title
}

/** Cargas clássicas de SQL injection (aspas, comentários, UNION, empilhamento, tempo). */
export const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users; --",
  "\" OR \"\"=\"",
  "1' UNION SELECT password_hash FROM users --",
  "') OR pg_sleep(2) IS NULL --",
  "admin'--",
  "%' OR 1=1 --",
  "\\'; select 1; --",
] as const

/** Cargas de XSS para campos de texto e HTML rico. */
export const XSS_PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "<svg/onload=alert(1)>",
  "<a href=\"javascript:alert(1)\">x</a>",
  "<iframe src=\"https://evil.example\"></iframe>",
  "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)></style></mglyph></table></mtext></math>",
  "<a href=\"jav&#x09;ascript:alert(1)\">x</a>",
  "<div style=\"background:url(javascript:alert(1))\">x</div>",
] as const

/**
 * Faz login "por fora" do agente e devolve o cabeçalho `Cookie` da sessão
 * nova (`lvl_session=...`), para reutilizar o token como um atacante faria.
 */
export async function signInCookie(app: INestApplication, email: string, password: string): Promise<string> {
  const response = await agent(app).post("/api/auth/sign-in", { email, password })
  if (response.status !== 200) throw new Error(`login falhou: ${response.status}`)
  return sessionCookieFrom(response.headers["set-cookie"])
}

/** Extrai `lvl_session=<token>` de um cabeçalho `Set-Cookie` (string ou lista). */
export function sessionCookieFrom(setCookie: unknown): string {
  const values: unknown[] = Array.isArray(setCookie) ? setCookie : [setCookie]
  for (const value of values) {
    if (typeof value !== "string") continue
    const match = /^(lvl_session=[^;]+)/.exec(value)
    if (match?.[1]) return match[1]
  }
  throw new Error("resposta sem cookie de sessão")
}
