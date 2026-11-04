import { expect, type Page } from "@playwright/test"
import type { Course, LessonSummary } from "@levelusp/contracts"
import { MAIN_FILE_PATH, ROUTES } from "@/lib/constants"

export interface Credentials {
  email: string
  password: string
}

export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "demonstracao123"
export const STUDENT: Credentials = { email: "aluna@levelusp.dev", password: DEMO_PASSWORD }
export const TEACHER: Credentials = { email: "professora@levelusp.dev", password: DEMO_PASSWORD }
export const ADMIN: Credentials = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@levelusp.dev",
  password: process.env.E2E_ADMIN_PASSWORD ?? "adminLevelusp2026",
}

export const NAVIGATION_TIMEOUT_MS = 20_000
/** Lição completa na tela: dados da API, editor e worker do Python. */
export const LESSON_LOAD_TIMEOUT_MS = 30_000

/** A API recusa métodos que alteram estado sem este cabeçalho (anti-CSRF). */
const CSRF_HEADERS = { "x-levelusp-csrf": "1" }

export async function login(page: Page, user: Credentials, next: string = ROUTES.dashboard) {
  await page.goto(ROUTES.loginWithNext(next))
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Senha", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  // O primeiro acesso do dia mostra a animação de sequência e só redireciona
  // depois de "Continuar". Espera o que vier primeiro: o redirecionamento ou o modal.
  const target = new RegExp(next.replace(/[/]/g, "\\/"))
  const continueButton = page.getByRole("button", { name: "Continuar", exact: true })
  const outcome = await Promise.race([
    page.waitForURL(target, { timeout: NAVIGATION_TIMEOUT_MS }).then(() => "redirect" as const),
    continueButton
      .waitFor({ state: "visible", timeout: NAVIGATION_TIMEOUT_MS })
      .then(() => "streak" as const),
  ])
  if (outcome === "streak") await continueButton.click()
  await expect(page).toHaveURL(target, { timeout: NAVIGATION_TIMEOUT_MS })
}

/** Chamada direta à API com os cookies da página (mesma origem) e o cabeçalho anti-CSRF. */
export function apiPost(page: Page, path: string, data: unknown) {
  return page.request.post(`/api${path}`, { data, headers: CSRF_HEADERS })
}

/** Envia `code` como `main.py` para correção no servidor. */
export function submitLessonCode(page: Page, lessonId: string, code: string) {
  return apiPost(page, `/lessons/${lessonId}/submissions`, {
    files: [{ path: MAIN_FILE_PATH, content: code }],
  })
}

export async function fetchFirstCourseId(page: Page): Promise<string> {
  const courses: Course[] = await (await page.request.get("/api/courses")).json()
  return courses[0].id
}

/** Lição curta do seed usada quando o teste só precisa de "uma lição qualquer". */
const DEFAULT_LESSON_SLUG = "python-completo-02"

/** Id de uma lição do seed de homologação, pelo slug. */
export async function fetchLessonId(page: Page, slug = DEFAULT_LESSON_SLUG): Promise<string> {
  const lessons: LessonSummary[] = await (await page.request.get("/api/lessons/summaries")).json()
  const lesson = lessons.find((summary) => summary.slug === slug)
  expect(lesson, `lição ${slug} do seed de homologação`).toBeTruthy()
  return lesson?.id ?? ""
}
