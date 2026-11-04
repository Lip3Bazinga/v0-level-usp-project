import { expect, test, type Page } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { LESSON_LOAD_TIMEOUT_MS, NAVIGATION_TIMEOUT_MS, STUDENT, fetchLessonId } from "../helpers"
import { signInAs, waitForPageToSettle } from "./ux-helpers"

const INTERNAL_SERVER_ERROR = 500
const SLOW_NETWORK_TIMEOUT_MS = 60_000
const MISSING_LESSON_ID = "00000000-0000-4000-8000-000000000000"
const MISSING_ROUTE = "/rota-que-nao-existe"

const BYTES_PER_KILOBIT = 1024 / 8
/** Rede 3G simulada: latência em ms, vazão em bytes/s. */
const SLOW_3G_CONDITIONS = {
  offline: false,
  latency: 400,
  downloadThroughput: 750 * BYTES_PER_KILOBIT,
  uploadThroughput: 250 * BYTES_PER_KILOBIT,
}

/** Simula a API fora do ar em tudo, menos a sessão (/auth/me). */
async function simulateApiOutage(page: Page, status = INTERNAL_SERVER_ERROR) {
  await page.route("**/api/**", (route) => {
    if (route.request().url().includes("/api/auth/me")) return route.continue()
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        statusCode: status,
        code: "INTERNAL",
        message: "Erro interno. Tente novamente.",
      }),
    })
  })
}

test.describe("falha da API não vira 'lista vazia'", () => {
  for (const { route, message } of [
    { route: ROUTES.courses, message: /Não foi possível carregar os cursos/ },
    { route: ROUTES.leaderboard, message: /Não foi possível carregar o ranking/ },
    { route: ROUTES.notes, message: /Não foi possível carregar suas anotações/ },
  ]) {
    test(`${route}: mostra erro e "Tentar novamente" que recupera`, async ({ page }) => {
      await signInAs(page, "aluna")
      await simulateApiOutage(page)
      await page.goto(route)
      const alert = page.getByRole("alert").filter({ hasText: message })
      await expect(alert).toBeVisible()
      await expect(
        page.getByText(/Nenhum curso encontrado|Nenhum estudante ainda|Nenhuma anotação ainda/),
      ).toHaveCount(0)
      // A API volta: "Tentar novamente" carrega os dados sem recarregar a página.
      await page.unrouteAll({ behavior: "ignoreErrors" })
      await page.getByRole("button", { name: "Tentar novamente" }).click()
      await expect(alert).toHaveCount(0)
    })
  }

  test("lição: erro de rede diferente de 'lição não encontrada', com nova tentativa", async ({
    page,
  }) => {
    await signInAs(page, "aluna")
    const lessonId = await fetchLessonId(page)
    await simulateApiOutage(page)
    await page.goto(ROUTES.lesson(lessonId))
    await expect(
      page.getByRole("heading", { name: "Não foi possível carregar a lição" }),
    ).toBeVisible()
    await page.unrouteAll({ behavior: "ignoreErrors" })
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page.getByRole("button", { name: /Executar/ }).first()).toBeVisible({
      timeout: LESSON_LOAD_TIMEOUT_MS,
    })
  })

  test("lição inexistente mostra 'Lição não encontrada' sem botão de tentar de novo", async ({
    page,
  }) => {
    await signInAs(page, "aluna")
    await page.goto(ROUTES.lesson(MISSING_LESSON_ID))
    await expect(page.getByRole("heading", { name: "Lição não encontrada" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toHaveCount(0)
  })
})

test("404: página própria com saída para o início e para o painel", async ({ page }) => {
  const response = await page.goto(MISSING_ROUTE)
  expect(response?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible()
  await expect(page.getByRole("link", { name: /Página inicial/ })).toHaveAttribute(
    "href",
    ROUTES.home,
  )
  await expect(page.getByRole("link", { name: /Ir para o painel/ })).toHaveAttribute(
    "href",
    ROUTES.dashboard,
  )
})

test("sessão expirada no meio da lição leva ao login preservando o destino", async ({
  page,
  context,
}) => {
  await signInAs(page, "aluna")
  const lessonId = await fetchLessonId(page)
  await page.goto(ROUTES.lesson(lessonId))
  await expect(page.getByRole("button", { name: /Executar/ }).first()).toBeVisible({
    timeout: LESSON_LOAD_TIMEOUT_MS,
  })
  await context.clearCookies()
  await page.goto(ROUTES.dashboard)
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/)
})

test("cadastro: validação de senha em pt-BR e duplo clique cria uma conta só", async ({ page }) => {
  const email = `ux+${Date.now()}@levelusp.dev`
  await page.goto(ROUTES.signup)
  await page.getByLabel("Nome completo").fill("Aluna UX")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Senha", { exact: true }).fill("abcdefghij")
  await page.getByRole("button", { name: /Criar Conta/i }).click()
  await expect(page.getByRole("alert").filter({ hasText: /número/ })).toBeVisible()
  await expect(page.locator("#signup-password-hint")).toContainText("Mínimo de 10 caracteres")
  await page.getByLabel("Senha", { exact: true }).fill("senhaForte123")
  const signUpStatuses: number[] = []
  page.on("response", (response) => {
    if (response.url().includes("/api/auth/sign-up")) signUpStatuses.push(response.status())
  })
  await page.getByRole("button", { name: /Criar Conta/i }).dblclick()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: NAVIGATION_TIMEOUT_MS })
  expect(signUpStatuses.filter((status) => status < 400)).toHaveLength(1)
})

test("rede lenta (3G): a tela de login aparece e o formulário funciona", async ({
  page,
  context,
}) => {
  const cdpSession = await context.newCDPSession(page)
  await cdpSession.send("Network.enable")
  await cdpSession.send("Network.emulateNetworkConditions", SLOW_3G_CONDITIONS)
  await page.goto(ROUTES.login, { timeout: SLOW_NETWORK_TIMEOUT_MS })
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible({
    timeout: SLOW_NETWORK_TIMEOUT_MS,
  })
  await page.getByLabel("Email").fill(STUDENT.email)
  await page.getByLabel("Senha", { exact: true }).fill("senhaErrada999")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("button", { name: /Entrando/ })).toBeDisabled()
  await expect(page.getByRole("alert").filter({ hasText: /incorretos/i })).toBeVisible({
    timeout: LESSON_LOAD_TIMEOUT_MS,
  })
})

test("painel do admin: falha da API mostra erro com nova tentativa", async ({ page }) => {
  await signInAs(page, "admin")
  await simulateApiOutage(page)
  await page.goto(ROUTES.admin)
  await expect(page.getByText("Não foi possível carregar o painel")).toBeVisible()
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()
})

test("admin: card de 'saúde da plataforma' com números fictícios foi removido", async ({
  page,
}) => {
  await signInAs(page, "admin")
  await page.goto(ROUTES.admin)
  await waitForPageToSettle(page)
  await expect(page.getByText(/uptime · 30d/)).toHaveCount(0)
  await expect(page.getByText(/conclusãoões/)).toHaveCount(0)
})
