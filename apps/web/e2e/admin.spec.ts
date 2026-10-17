import { expect, test } from "@playwright/test"
import { ADMIN, login, STUDENT, TEACHER } from "./helpers"

test("admin acessa o painel e vê os usuários", async ({ page }) => {
  await login(page, ADMIN, "/admin")
  const users = await page.request.get("/api/admin/users")
  expect(users.ok()).toBeTruthy()
  expect((await users.json()).length).toBeGreaterThan(0)
})

test("aluna não acessa rotas de administração", async ({ page }) => {
  await login(page, STUDENT)
  const res = await page.request.get("/api/admin/users")
  expect(res.status()).toBe(403)
})

test("professora vê suas lições com métricas", async ({ page }) => {
  await login(page, TEACHER, "/teacher")
  const res = await page.request.get("/api/teacher/metrics")
  expect(res.ok()).toBeTruthy()
  expect(Array.isArray(await res.json())).toBeTruthy()
  // O professor dono enxerga o gabarito na edição
  const lessons = await (await page.request.get("/api/teacher/lessons")).json()
  const authoring = await (await page.request.get(`/api/lessons/${lessons[0].id}/authoring`)).json()
  expect(authoring.test_cases.length).toBeGreaterThan(0)
})
