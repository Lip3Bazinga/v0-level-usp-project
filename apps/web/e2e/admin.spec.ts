import { expect, test } from "@playwright/test"
import { HTTP_STATUS } from "@/lib/api/client"
import { ROUTES } from "@/lib/constants"
import { ADMIN, STUDENT, TEACHER, login } from "./helpers"

test("admin acessa o painel e vê os usuários", async ({ page }) => {
  await login(page, ADMIN, ROUTES.admin)
  const users = await page.request.get("/api/admin/users")
  expect(users.ok()).toBeTruthy()
  expect((await users.json()).length).toBeGreaterThan(0)
})

test("aluna não acessa rotas de administração", async ({ page }) => {
  await login(page, STUDENT)
  const response = await page.request.get("/api/admin/users")
  expect(response.status()).toBe(HTTP_STATUS.FORBIDDEN)
})

test("professora vê suas lições com métricas", async ({ page }) => {
  await login(page, TEACHER, ROUTES.teacher)
  const response = await page.request.get("/api/teacher/metrics")
  expect(response.ok()).toBeTruthy()
  expect(Array.isArray(await response.json())).toBeTruthy()
  // O professor dono enxerga o gabarito na edição
  const lessons = await (await page.request.get("/api/teacher/lessons")).json()
  const authoring = await (await page.request.get(`/api/lessons/${lessons[0].id}/authoring`)).json()
  expect(authoring.test_cases.length).toBeGreaterThan(0)
})
