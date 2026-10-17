import { expect, test, type Page } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { fetchFirstCourseId, fetchLessonId, measureHorizontalOverflow, signInAs, waitForPageToSettle, type Persona } from "./ux-helpers"

/** Sem rolagem horizontal nos 4 tamanhos de tela de referência. */
const VIEWPORTS = [
  { name: "desktop 1440×900", width: 1440, height: 900 },
  { name: "tablet paisagem 1024×768", width: 1024, height: 768 },
  { name: "tablet retrato 768×1024", width: 768, height: 1024 },
  { name: "celular 390×844", width: 390, height: 844 },
]

/** Rota fixa ou montada com ids do seed, consultados na API na hora do teste. */
type ScreenRoute = string | ((page: Page) => Promise<string>)

const courseRoute = async (page: Page) => ROUTES.course(await fetchFirstCourseId(page))
const courseEditorRoute = async (page: Page) => ROUTES.teacherCourse(await fetchFirstCourseId(page))
const lessonRoute = async (page: Page) => ROUTES.lesson(await fetchLessonId(page))

const ROUTES_BY_PERSONA: { persona: Persona; routes: ScreenRoute[] }[] = [
  {
    persona: "visitante",
    routes: [
      ROUTES.home, ROUTES.site.about, ROUTES.site.tracks, ROUTES.site.methodology, ROUTES.site.impact, ROUTES.site.team,
      ROUTES.site.partners, ROUTES.site.faq, ROUTES.site.contact, ROUTES.login, ROUTES.signup, ROUTES.forgotPassword,
      ROUTES.certificate("LVL-0000-0000"), "/rota-que-nao-existe",
    ],
  },
  {
    persona: "aluna",
    routes: [
      ROUTES.dashboard, ROUTES.courses, courseRoute, lessonRoute, ROUTES.leaderboard, ROUTES.notes, ROUTES.settings,
      ROUTES.profile("aluna_demo"),
    ],
  },
  { persona: "professora", routes: [ROUTES.teacher, courseEditorRoute, ROUTES.teacherNewLesson] },
  { persona: "admin", routes: [ROUTES.admin] },
]

/** Até 1px de diferença é arredondamento do navegador, não rolagem. */
const MAX_OVERFLOW_PX = 1

for (const viewport of VIEWPORTS) {
  for (const { persona, routes } of ROUTES_BY_PERSONA) {
    test(`sem rolagem horizontal — ${persona} — ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await signInAs(page, persona)
      const overflowingRoutes: string[] = []
      for (const screenRoute of routes) {
        const route = typeof screenRoute === "string" ? screenRoute : await screenRoute(page)
        await page.goto(route)
        await waitForPageToSettle(page)
        const overflowPx = await measureHorizontalOverflow(page)
        if (overflowPx > MAX_OVERFLOW_PX) overflowingRoutes.push(`${route} (+${overflowPx}px)`)
      }
      expect(overflowingRoutes).toEqual([])
    })
  }
}

test("menu do painel: navegação completa no desktop, barra inferior até 1023px", async ({ page }) => {
  await signInAs(page, "aluna")
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto(ROUTES.dashboard)
  await waitForPageToSettle(page)
  const visibleNav = page.getByRole("navigation", { name: "Navegação principal" }).filter({ visible: true })
  await expect(visibleNav).toHaveCount(1)
  // Em 768px a barra visível é a inferior (fixa no rodapé).
  const tabletBox = await visibleNav.boundingBox()
  expect(tabletBox?.y).toBeGreaterThan(900)
  await page.setViewportSize({ width: 1440, height: 900 })
  const desktopBox = await visibleNav.boundingBox()
  expect(desktopBox?.y).toBeLessThan(80)
})

test("IDE no celular: abas Aprender/Código/Console/Arquivos e botão de notas fora do caminho", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signInAs(page, "aluna")
  await page.goto(await lessonRoute(page))
  await waitForPageToSettle(page)
  for (const tabName of ["Aprender", "Código", "Console", "Arquivos"]) {
    await expect(page.getByRole("button", { name: tabName }).last()).toBeVisible()
  }
  // O botão flutuante de notas não pode cobrir a aba "Arquivos" nem o "Verificar".
  await expect(page.getByRole("button", { name: "Abrir caderno de anotações" })).toBeHidden()
  await page.getByRole("button", { name: "Código" }).last().click()
  await expect(page.locator(".cm-content:visible")).toHaveCount(1)
})
