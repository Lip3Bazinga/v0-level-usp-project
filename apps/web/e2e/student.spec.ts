import { expect, test } from "@playwright/test"
import { apiPost, login, STUDENT } from "./helpers"

test("cadastro cria a conta e abre o painel", async ({ page }) => {
  const email = `e2e+${Date.now()}@levelusp.dev`
  await page.goto("/signup")
  await page.getByPlaceholder("Seu nome completo").fill("Aluna E2E")
  await page.getByPlaceholder("seu@email.com").fill(email)
  await page.getByPlaceholder(/Mínimo 10 caracteres/).fill("senhaForte123")
  await page.getByRole("button", { name: /Criar Conta/i }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  const me = await page.request.get("/api/auth/me")
  expect((await me.json()).user.email).toBe(email)
})

test("login com senha errada mostra o erro da API", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill(STUDENT.email)
  await page.getByLabel("Senha", { exact: true }).fill("senhaErrada999")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("alert").filter({ hasText: /incorretos/i })).toBeVisible()
})

test("aluna vê o catálogo e o curso Python Completo", async ({ page }) => {
  await login(page, STUDENT)
  await page.goto("/cursos")
  await expect(page.getByText("Python Completo").first()).toBeVisible()
})

test("correção no servidor: errado reprova, certo aprova e credita XP uma vez", async ({ page }) => {
  await login(page, STUDENT)
  const lessons = await (await page.request.get("/api/lessons/summaries")).json()
  const lesson = lessons.find((l: { slug: string }) => l.slug === "python-completo-03")
  expect(lesson, "seed de homologação aplicado").toBeTruthy()
  // O gabarito nunca vem para o navegador
  const full = await (await page.request.get(`/api/lessons/${lesson.id}`)).json()
  expect(JSON.stringify(full)).not.toContain("test_cases")

  const wrong = await apiPost(page, `/lessons/${lesson.id}/submissions`, {
    files: [{ path: "main.py", content: "def dobro_mais_um(n):\n    return n\n\ndef eh_par(n):\n    return True\n\ndef esta_no_intervalo(x, a, b):\n    return False\n" }],
  })
  expect(wrong.ok()).toBeTruthy()
  expect(await wrong.json()).toMatchObject({ allPassed: false, xp_awarded: 0 })

  const right = await apiPost(page, `/lessons/${lesson.id}/submissions`, {
    files: [{ path: "main.py", content: "def dobro_mais_um(n):\n    return 2 * n + 1\n\ndef eh_par(n):\n    return n % 2 == 0\n\ndef esta_no_intervalo(x, minimo, maximo):\n    return minimo <= x <= maximo\n" }],
  })
  const body = await right.json()
  expect(body.allPassed).toBe(true)
  expect(body.strength).toBe("strong")

  const again = await apiPost(page, `/lessons/${lesson.id}/submissions`, {
    files: [{ path: "main.py", content: "def dobro_mais_um(n):\n    return 2 * n + 1\n\ndef eh_par(n):\n    return n % 2 == 0\n\ndef esta_no_intervalo(x, minimo, maximo):\n    return minimo <= x <= maximo\n" }],
  })
  expect((await again.json()).xp_awarded).toBe(0)
})

test("sandbox: código malicioso não acessa o servidor", async ({ page }) => {
  await login(page, STUDENT)
  const lessons = await (await page.request.get("/api/lessons/summaries")).json()
  const lesson = lessons.find((l: { slug: string }) => l.slug === "python-completo-03")
  const res = await apiPost(page, `/lessons/${lesson.id}/submissions`, {
    files: [{ path: "main.py", content: "import os\ndef dobro_mais_um(n):\n    return open('/proc/1/environ').read()\n" }],
  })
  const body = await res.json()
  expect(body.allPassed).toBe(false)
  expect(JSON.stringify(body)).toMatch(/FileNotFoundError|No such file/)
})
