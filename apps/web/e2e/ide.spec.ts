import { expect, test } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { LESSON_LOAD_TIMEOUT_MS, STUDENT, fetchLessonId, login } from "./helpers"

// Depende do Pyodide (CDN jsDelivr) no navegador. Desligue com E2E_SKIP_PYODIDE=1
// em ambientes sem acesso à internet.
test.skip(process.env.E2E_SKIP_PYODIDE === "1", "sem acesso ao CDN do Pyodide")

/** Baixar o Pyodide do CDN pode levar bem mais que carregar a lição. */
const PYODIDE_READY_TIMEOUT_MS = 60_000

test("IDE executa no navegador e verifica no servidor", async ({ page }) => {
  await login(page, STUDENT)
  await page.goto(ROUTES.lesson(await fetchLessonId(page, "python-completo-07")))
  await expect(page.getByRole("button", { name: /Executar/i })).toBeEnabled({
    timeout: PYODIDE_READY_TIMEOUT_MS,
  })
  await page.getByRole("button", { name: /Executar/i }).click()
  await expect(page.getByRole("button", { name: /Verificar/i })).toBeEnabled({
    timeout: PYODIDE_READY_TIMEOUT_MS,
  })
  await page.getByRole("button", { name: /Verificar/i }).click()
  // O esqueleto inicial não resolve o exercício: o servidor reprova com mensagens por caso.
  await expect(page.getByText(/não é o esperado|erro:|Teste/i).first()).toBeVisible({
    timeout: LESSON_LOAD_TIMEOUT_MS,
  })
})
