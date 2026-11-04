import { expect, test, type Page } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { fetchFirstCourseId } from "../helpers"
import {
  STRUCTURAL_AXE_RULES,
  courseRoute,
  findAxeViolations,
  lessonRoute,
  resolveScreenRoute,
  signInAs,
  waitForPageToSettle,
  type Persona,
  type ScreenRoute,
} from "./ux-helpers"

/**
 * Regressão de acessibilidade (WCAG 2.2 AA) com axe-core nas telas principais.
 * - Regras estruturais (nomes acessíveis, rótulos, ARIA, interativo aninhado, alvo mínimo)
 *   devem estar zeradas em todas as telas.
 * - Contraste é exigido nas telas cujo contraste já foi corrigido (`checksContrast`).
 */

interface AuditedScreen {
  persona: Persona
  label: string
  route: ScreenRoute
  checksContrast?: boolean
}

const courseExamRoute = async (page: Page): Promise<string> => ROUTES.courseExam(await fetchFirstCourseId(page))

const MISSING_CERTIFICATE_CODE = "LVL-0000-0000"
const MISSING_ROUTE = "/rota-que-nao-existe"

const SCREENS: AuditedScreen[] = [
  { persona: "visitante", label: ROUTES.home, route: ROUTES.home, checksContrast: true },
  { persona: "visitante", label: ROUTES.login, route: ROUTES.login, checksContrast: true },
  { persona: "visitante", label: ROUTES.signup, route: ROUTES.signup, checksContrast: true },
  {
    persona: "visitante",
    label: ROUTES.forgotPassword,
    route: ROUTES.forgotPassword,
    checksContrast: true,
  },
  {
    persona: "visitante",
    label: ROUTES.resetPassword,
    route: ROUTES.resetPassword,
    checksContrast: true,
  },
  {
    persona: "visitante",
    label: ROUTES.site.impact,
    route: ROUTES.site.impact,
    checksContrast: true,
  },
  {
    persona: "visitante",
    label: ROUTES.certificate(MISSING_CERTIFICATE_CODE),
    route: ROUTES.certificate(MISSING_CERTIFICATE_CODE),
    checksContrast: true,
  },
  { persona: "visitante", label: MISSING_ROUTE, route: MISSING_ROUTE, checksContrast: true },
  { persona: "aluna", label: ROUTES.dashboard, route: ROUTES.dashboard },
  { persona: "aluna", label: ROUTES.courses, route: ROUTES.courses, checksContrast: true },
  { persona: "aluna", label: "/cursos/:id", route: courseRoute },
  { persona: "aluna", label: "/cursos/:id/prova", route: courseExamRoute, checksContrast: true },
  { persona: "aluna", label: "/lesson/:id", route: lessonRoute },
  { persona: "aluna", label: ROUTES.leaderboard, route: ROUTES.leaderboard },
  { persona: "aluna", label: ROUTES.notes, route: ROUTES.notes, checksContrast: true },
  { persona: "aluna", label: ROUTES.settings, route: ROUTES.settings, checksContrast: true },
  {
    persona: "aluna",
    label: "/perfil/aluna_demo",
    route: ROUTES.profile("aluna_demo"),
    checksContrast: true,
  },
  { persona: "professora", label: ROUTES.teacher, route: ROUTES.teacher },
  { persona: "professora", label: ROUTES.teacherNewLesson, route: ROUTES.teacherNewLesson },
  { persona: "admin", label: ROUTES.admin, route: ROUTES.admin },
]

for (const screen of SCREENS) {
  test(`axe sem violações estruturais — ${screen.persona} ${screen.label}`, async ({ page }) => {
    await signInAs(page, screen.persona)
    await page.goto(await resolveScreenRoute(page, screen.route))
    await waitForPageToSettle(page)
    expect(await findAxeViolations(page, STRUCTURAL_AXE_RULES)).toEqual([])
    if (screen.checksContrast) expect(await findAxeViolations(page, ["color-contrast"])).toEqual([])
  })
}

test("documento em pt-BR com título e landmark principal", async ({ page }) => {
  for (const route of [ROUTES.home, ROUTES.login, ROUTES.signup, ROUTES.courses]) {
    await page.goto(route)
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR")
    await expect(page).toHaveTitle(/LevelUSP/)
  }
})

test("prefers-reduced-motion: confete e animações em loop desligados", async ({ browser }) => {
  const { baseURL } = test.info().project.use
  const context = await browser.newContext({ reducedMotion: "reduce", ...(baseURL !== undefined && { baseURL }) })
  const page = await context.newPage()
  await page.goto(ROUTES.home)
  await waitForPageToSettle(page)
  // Tailwind animate-pulse/bounce/ping e o gradiente animado ficam parados.
  const animatedCount = await page.evaluate(
    () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".animate-pulse, .animate-bounce, .animate-ping, .gradient-text",
        ),
      ).filter((element) => getComputedStyle(element).animationName !== "none").length,
  )
  expect(animatedCount).toBe(0)
  await context.close()
})
