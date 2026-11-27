import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test"
import type { Course, Lesson, LessonSummary, Track } from "@levelusp/contracts"
import { ADMIN, STUDENT, TEACHER, login, readJson, type Credentials } from "./helpers"

/**
 * Varredura de rotas: toda tela do App Router carrega, nos três papéis, sem erro de console
 * nem requisição com 5xx (ou 4xx inesperado). Com `ROTAS_RELATORIO=1` grava o relatório em
 * `.claude-transfer/telas/relatorio.md` (com screenshots das falhas).
 *   E2E_BASE_URL=http://localhost:3000 pnpm --filter @levelusp/web test:e2e e2e/rotas.spec.ts
 */

type Role = "aluno" | "professor" | "admin"

interface RouteCheck {
  role: Role
  path: string
  label: string
}

interface RouteResult extends RouteCheck {
  ok: boolean
  loadMs: number
  finalPath: string
  problems: string[]
}

const CONTENT_TIMEOUT_MS = 30_000
const REPORT_DIR = join(__dirname, "..", "..", "..", ".claude-transfer", "telas")
const WRITE_REPORT = process.env.ROTAS_RELATORIO === "1"

/** Respostas 4xx que a própria tela espera (sessão ausente em telas públicas, recurso opcional). */
const EXPECTED_4XX: readonly RegExp[] = [/\/api\/auth\/me$/, /\/api\/me$/, /\/api\/me\/session$/]

const PUBLIC_PATHS = ["/", "/landing", "/login", "/signup", "/esqueci-senha", "/redefinir-senha", "/sobre", "/metodologia", "/trilhas", "/equipe", "/faq", "/contato", "/parceiros"]
const STUDENT_PATHS = ["/dashboard", "/cursos", "/ide", "/notas", "/leaderboard", "/perfil/me", "/perfil/me/conta"]
const TEACHER_PATHS = ["/teacher", "/teacher/edit/new", "/teacher/curso/new"]
const ADMIN_PATHS = ["/admin"]

const results: RouteResult[] = []

async function newSession(browser: Browser, user: Credentials, next: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" })
  const page = await context.newPage()
  await login(page, user, next)
  return { context, page }
}

async function getJson<T>(page: Page, path: string): Promise<T> {
  const response = await page.request.get(`/api${path}`)
  expect(response.ok(), `GET /api${path}`).toBe(true)
  return readJson<T>(response)
}

/** Um curso por nível, uma lição de cada combinação (tipo de lição, tipo de passo, modo) e a trilha. */
async function discoverDynamicPaths(page: Page): Promise<RouteCheck[]> {
  const checks: RouteCheck[] = []
  const add = (path: string, label: string): void => void checks.push({ role: "aluno", path, label })

  const courses = await getJson<Course[]>(page, "/courses")
  const seenLevels = new Set<string>()
  for (const course of courses) {
    if (seenLevels.has(course.level)) continue
    seenLevels.add(course.level)
    add(`/cursos/${course.id}`, `curso (${course.level})`)
    add(`/cursos/${course.id}/prova`, `prova do curso (${course.level})`)
  }

  const tracks = await getJson<Track[]>(page, "/tracks")
  for (const track of tracks.slice(0, 1)) add(`/trilhas/${track.slug}`, "trilha")

  const summaries = await getJson<LessonSummary[]>(page, "/lessons/summaries")
  const covered = new Set<string>()
  const queue = [...summaries]
  const workers = Array.from({ length: 8 }, async () => {
    for (let summary = queue.shift(); summary; summary = queue.shift()) {
      const lesson = await getJson<Lesson>(page, `/lessons/${summary.id}`)
      const signatures = [`tipo:${summary.lesson_type}`, ...lesson.steps.map((step) => `passo:${step.kind}/${step.exercise_mode}`)]
      const fresh = signatures.filter((signature) => !covered.has(signature))
      if (fresh.length === 0) continue
      fresh.forEach((signature) => covered.add(signature))
      add(`/lesson/${summary.id}`, `lição ${summary.slug ?? summary.id} (${fresh.join(", ")})`)
    }
  })
  await Promise.all(workers)
  return checks
}

async function visit(page: Page, check: RouteCheck): Promise<RouteResult> {
  const problems: string[] = []
  const onConsole = (message: { type(): string; text(): string }): void => {
    if (message.type() === "error") problems.push(`console: ${message.text().slice(0, 200)}`)
  }
  const onPageError = (error: Error): void => void problems.push(`exceção: ${error.message.slice(0, 200)}`)
  const onResponse = (response: { status(): number; url(): string }): void => {
    const status = response.status()
    if (status < 400 || EXPECTED_4XX.some((pattern) => pattern.test(response.url()))) return
    problems.push(`HTTP ${status}: ${new URL(response.url()).pathname}`)
  }
  const onFailed = (request: { url(): string; failure(): { errorText: string } | null }): void => {
    const errorText = request.failure()?.errorText ?? "falhou"
    if (errorText.includes("ERR_ABORTED")) return
    problems.push(`sem resposta (${errorText}): ${new URL(request.url()).pathname}`)
  }
  page.on("console", onConsole)
  page.on("pageerror", onPageError)
  page.on("response", onResponse)
  page.on("requestfailed", onFailed)

  const started = Date.now()
  try {
    await page.goto(check.path, { waitUntil: "domcontentloaded", timeout: CONTENT_TIMEOUT_MS })
    await page.locator("main, h1, [role=main]").first().waitFor({ state: "visible", timeout: CONTENT_TIMEOUT_MS })
    await page.waitForLoadState("networkidle", { timeout: CONTENT_TIMEOUT_MS }).catch(() => problems.push("rede não ficou ociosa em 30 s"))
  } catch (error) {
    problems.push(`não carregou: ${(error as Error).message.split("\n")[0]}`)
  }
  const loadMs = Date.now() - started
  const bodyText = (await page.locator("body").innerText().catch(() => "")).slice(0, 4000)
  if (/Application error|Internal Server Error|This page could not be found/i.test(bodyText)) problems.push("tela de erro do Next")

  page.off("console", onConsole)
  page.off("pageerror", onPageError)
  page.off("response", onResponse)
  page.off("requestfailed", onFailed)

  const result: RouteResult = { ...check, ok: problems.length === 0, loadMs, finalPath: new URL(page.url()).pathname, problems }
  if (!result.ok && WRITE_REPORT) {
    mkdirSync(REPORT_DIR, { recursive: true })
    const name = `${check.role}${check.path.replace(/[^a-z0-9]+/gi, "_")}.png`
    await page.screenshot({ path: join(REPORT_DIR, name), fullPage: true }).catch(() => undefined)
  }
  return result
}

function renderReport(): string {
  const failed = results.filter((result) => !result.ok)
  const lines = [
    "# Varredura de telas (localhost)",
    "",
    `${results.length} telas visitadas, ${failed.length} com problema.`,
    "",
    "| Papel | Rota | Tela | OK | Tempo (ms) | Destino final | Problemas |",
    "|---|---|---|---|---|---|---|",
    ...results.map((r) => `| ${r.role} | \`${r.path}\` | ${r.label} | ${r.ok ? "sim" : "NÃO"} | ${r.loadMs} | \`${r.finalPath}\` | ${[...new Set(r.problems)].join("<br>").replace(/\|/g, "\\|")} |`),
  ]
  return lines.join("\n")
}

test.describe.configure({ mode: "serial" })
test.setTimeout(30 * 60_000)

test.afterAll(() => {
  if (!WRITE_REPORT) return
  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(join(REPORT_DIR, "relatorio.md"), renderReport())
})

const ROLES: readonly { role: Role; user: Credentials; paths: string[] }[] = [
  { role: "aluno", user: STUDENT, paths: [...PUBLIC_PATHS, ...STUDENT_PATHS] },
  { role: "professor", user: TEACHER, paths: [...STUDENT_PATHS, ...TEACHER_PATHS] },
  { role: "admin", user: ADMIN, paths: [...STUDENT_PATHS, ...TEACHER_PATHS, ...ADMIN_PATHS] },
]

for (const { role, user, paths } of ROLES) {
  test(`rotas carregam sem erro como ${role}`, async ({ browser }) => {
    const { context, page } = await newSession(browser, user, role === "admin" ? "/admin" : "/dashboard")
    try {
      const checks: RouteCheck[] = paths.map((path) => ({ role, path, label: "estática" }))
      checks.push(...(await discoverDynamicPaths(page)).map((check) => ({ ...check, role })))
      // Perfil público, notas e certificado dependem de dados do usuário logado.
      const me = await getJson<{ username?: string | null }>(page, "/me").catch(() => ({ username: null }))
      if (me.username) checks.push({ role, path: `/perfil/${me.username}`, label: "perfil público" })
      const certificates = await getJson<{ verification_code: string }[]>(page, "/me/certificates").catch(() => [])
      for (const certificate of certificates.slice(0, 1)) checks.push({ role, path: `/certificado/${certificate.verification_code}`, label: "certificado" })

      for (const check of checks) results.push(await visit(page, check))
      const failures = results.filter((result) => result.role === role && !result.ok).map((result) => `${result.path}: ${[...new Set(result.problems)].join("; ")}`)
      expect(failures, `telas com problema (${role})`).toEqual([])
    } finally {
      await context.close()
    }
  })
}
