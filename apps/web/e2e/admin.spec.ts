import { expect, test } from "@playwright/test"
import { HTTP_STATUS } from "@/lib/api/client"
import { ROUTES } from "@/lib/constants"
import type { Lesson, LessonWithTests, Profile } from "@levelusp/contracts"
import { ADMIN, STUDENT, TEACHER, login, readJson } from "./helpers"

test("admin acessa o painel e vê os usuários", async ({ page }) => {
  await login(page, ADMIN, ROUTES.admin)
  const users = await page.request.get("/api/admin/users")
  expect(users.ok()).toBeTruthy()
  expect((await readJson<Profile[]>(users)).length).toBeGreaterThan(0)
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
  const [firstLesson] = await readJson<Lesson[]>(await page.request.get("/api/teacher/lessons"))
  expect(firstLesson, "lição da professora no seed").toBeTruthy()
  const authoring = await readJson<LessonWithTests>(await page.request.get(`/api/lessons/${firstLesson?.id ?? ""}/authoring`))
  expect(authoring.test_cases.length).toBeGreaterThan(0)
})
