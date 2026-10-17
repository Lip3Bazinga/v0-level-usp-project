import AxeBuilder from "@axe-core/playwright"
import { expect, type Page } from "@playwright/test"
import type { Course, LessonSummary } from "@levelusp/contracts"
import { ADMIN, STUDENT, TEACHER, apiPost, type Credentials } from "../helpers"

/** Perfis percorridos pelos testes de UX; o valor aparece no título de cada teste. */
export type Persona = "visitante" | "aluna" | "professora" | "admin"

const CREDENTIALS: Record<Exclude<Persona, "visitante">, Credentials> = {
  aluna: STUDENT,
  professora: TEACHER,
  admin: ADMIN,
}

const DEFAULT_LESSON_SLUG = "python-completo-02"

/** Pausa para as animações de entrada terminarem antes de medir a tela. */
const SETTLE_DELAY_MS = 600

/** Login direto pela API (mais rápido que a tela); o cookie fica no contexto da página. */
export async function signInAs(page: Page, persona: Persona) {
  if (persona === "visitante") return
  const response = await apiPost(page, "/auth/sign-in", CREDENTIALS[persona])
  expect(response.ok(), `login de ${persona}`).toBeTruthy()
}

export async function fetchFirstCourseId(page: Page): Promise<string> {
  const courses: Course[] = await (await page.request.get("/api/courses")).json()
  return courses[0].id
}

export async function fetchLessonId(page: Page, slug = DEFAULT_LESSON_SLUG): Promise<string> {
  const lessons: LessonSummary[] = await (await page.request.get("/api/lessons/summaries")).json()
  const lesson = lessons.find((summary) => summary.slug === slug)
  expect(lesson, `lição ${slug} do seed de homologação`).toBeTruthy()
  return lesson?.id ?? ""
}

/** Espera a tela "assentar" (dados carregados, animações de entrada concluídas). */
export async function waitForPageToSettle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(SETTLE_DELAY_MS)
}

/**
 * Regras do axe que DEVEM estar zeradas em todas as telas principais.
 * (Contraste é verificado à parte, só nas telas já corrigidas; ver a11y.spec.ts.)
 */
export const STRUCTURAL_AXE_RULES = [
  "button-name",
  "link-name",
  "label",
  "select-name",
  "input-button-name",
  "aria-input-field-name",
  "aria-toggle-field-name",
  "aria-allowed-attr",
  "aria-prohibited-attr",
  "aria-required-attr",
  "aria-valid-attr-value",
  "aria-roles",
  "nested-interactive",
  "image-alt",
  "html-has-lang",
  "html-lang-valid",
  "document-title",
  "duplicate-id-aria",
  "list",
  "listitem",
  "target-size",
]

/** Violações do axe nas regras pedidas, uma linha por regra com até 3 elementos culpados. */
export async function findAxeViolations(page: Page, rules: string[]): Promise<string[]> {
  let builder = new AxeBuilder({ page }).withRules(rules)
  // Números e ornamentos marcados aria-hidden são decoração (a WCAG 1.4.3 isenta texto decorativo).
  if (rules.includes("color-contrast")) builder = builder.exclude('[aria-hidden="true"]')
  const results = await builder.analyze()
  return results.violations.map((violation) => {
    const targets = violation.nodes.map((node) => node.target.join(" ")).slice(0, 3)
    return `${violation.id}: ${targets.join(" | ")}`
  })
}

/** Largura do documento além da viewport: rolagem horizontal indesejada. */
export async function measureHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}
