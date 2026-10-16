import { expect, test } from "@playwright/test"
import { login, STUDENT } from "./helpers"

// Depende do Pyodide (CDN jsDelivr) no navegador. Desligue com E2E_SKIP_PYODIDE=1
// em ambientes sem acesso à internet.
test.skip(process.env.E2E_SKIP_PYODIDE === "1", "sem acesso ao CDN do Pyodide")

test("IDE executa no navegador e verifica no servidor", async ({ page }) => {
  await login(page, STUDENT)
  const lessons = await (await page.request.get("/api/lessons/summaries")).json()
  const lesson = lessons.find((l: { slug: string }) => l.slug === "python-completo-07")
  await page.goto(`/lesson/${lesson.id}`)
  await expect(page.getByRole("button", { name: /Executar/i })).toBeEnabled({ timeout: 60_000 })
  await page.getByRole("button", { name: /Executar/i }).click()
  await expect(page.getByRole("button", { name: /Verificar/i })).toBeEnabled({ timeout: 60_000 })
  await page.getByRole("button", { name: /Verificar/i }).click()
  // O esqueleto inicial não resolve o exercício: o servidor reprova com mensagens por caso.
  await expect(page.getByText(/não é o esperado|erro:|Teste/i).first()).toBeVisible({ timeout: 30_000 })
})
