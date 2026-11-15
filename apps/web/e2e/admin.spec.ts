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
  const lessons = await readJson<Lesson[]>(await page.request.get("/api/teacher/lessons"))
  // O pacote traz lições ainda sem conteúdo (rascunhos dos níveis 2–7): usa uma publicada com exercício.
  const exerciseLesson = lessons.find((lesson) => lesson.slug === "n1-m2-01-ola-python")
  expect(exerciseLesson, "lição com exercício no seed").toBeTruthy()
  const authoring = await readJson<LessonWithTests>(await page.request.get(`/api/lessons/${exerciseLesson?.id ?? ""}/authoring`))
  // Lição guiada: o gabarito fica nos passos de exercício.
  const stepTestCases = authoring.authoring_steps.flatMap((step) => step.test_cases)
  expect(authoring.test_cases.length + stepTestCases.length).toBeGreaterThan(0)
})
