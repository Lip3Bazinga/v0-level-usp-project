import { expect, test } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { NAVIGATION_TIMEOUT_MS, STUDENT, fetchLessonId, login, submitLessonCode } from "./helpers"

/** Lição de funções do seed: `dobro_mais_um`, `eh_par` e `esta_no_intervalo`. */
const FUNCTIONS_LESSON_SLUG = "python-completo-03"

const WRONG_SOLUTION =
  "def dobro_mais_um(n):\n    return n\n\ndef eh_par(n):\n    return True\n\ndef esta_no_intervalo(x, a, b):\n    return False\n"
const RIGHT_SOLUTION =
  "def dobro_mais_um(n):\n    return 2 * n + 1\n\ndef eh_par(n):\n    return n % 2 == 0\n\ndef esta_no_intervalo(x, minimo, maximo):\n    return minimo <= x <= maximo\n"
const ENVIRONMENT_LEAK_ATTEMPT =
  "import os\ndef dobro_mais_um(n):\n    return open('/proc/1/environ').read()\n"

test("cadastro cria a conta e abre o painel", async ({ page }) => {
  const email = `e2e+${Date.now()}@levelusp.dev`
  await page.goto(ROUTES.signup)
  await page.getByPlaceholder("Seu nome completo").fill("Aluna E2E")
  await page.getByPlaceholder("seu@email.com").fill(email)
  await page.getByPlaceholder(/Mínimo 10 caracteres/).fill("senhaForte123")
  await page.getByRole("button", { name: /Criar Conta/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: NAVIGATION_TIMEOUT_MS })
  const me = await page.request.get("/api/auth/me")
  expect((await me.json()).user.email).toBe(email)
})

test("login com senha errada mostra o erro da API", async ({ page }) => {
  await page.goto(ROUTES.login)
  await page.getByLabel("Email").fill(STUDENT.email)
  await page.getByLabel("Senha", { exact: true }).fill("senhaErrada999")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("alert").filter({ hasText: /incorretos/i })).toBeVisible()
})

test("aluna vê o catálogo e o curso Python Completo", async ({ page }) => {
  await login(page, STUDENT)
  await page.goto(ROUTES.courses)
  await expect(page.getByText("Python Completo").first()).toBeVisible()
})

test("correção no servidor: errado reprova, certo aprova e credita XP uma vez", async ({
  page,
}) => {
  await login(page, STUDENT)
  const lessonId = await fetchLessonId(page, FUNCTIONS_LESSON_SLUG)
  // O gabarito nunca vem para o navegador
  const lesson = await (await page.request.get(`/api/lessons/${lessonId}`)).json()
  expect(JSON.stringify(lesson)).not.toContain("test_cases")

  const wrong = await submitLessonCode(page, lessonId, WRONG_SOLUTION)
  expect(wrong.ok()).toBeTruthy()
  expect(await wrong.json()).toMatchObject({ allPassed: false, xp_awarded: 0 })

  const right = await (await submitLessonCode(page, lessonId, RIGHT_SOLUTION)).json()
  expect(right.allPassed).toBe(true)
  expect(right.strength).toBe("strong")

  const again = await (await submitLessonCode(page, lessonId, RIGHT_SOLUTION)).json()
  expect(again.xp_awarded).toBe(0)
})

test("sandbox: código malicioso não acessa o servidor", async ({ page }) => {
  await login(page, STUDENT)
  const lessonId = await fetchLessonId(page, FUNCTIONS_LESSON_SLUG)
  const result = await (await submitLessonCode(page, lessonId, ENVIRONMENT_LEAK_ATTEMPT)).json()
  expect(result.allPassed).toBe(false)
  expect(JSON.stringify(result)).toMatch(/FileNotFoundError|No such file/)
})
