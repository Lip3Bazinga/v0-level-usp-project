import { expect, test } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { BROWSER_PYTHON_MINOR_VERSION } from "@/lib/python/runtime-config"
import { LESSON_LOAD_TIMEOUT_MS, STUDENT, fetchLessonId, login } from "./helpers"

// O núcleo do Pyodide é servido pelo próprio front (public/pyodide, gerado no build).
// Desligue com E2E_SKIP_PYODIDE=1 em ambientes onde o WebAssembly não roda.
test.skip(process.env.E2E_SKIP_PYODIDE === "1", "sem Python no navegador")

/** Baixar e iniciar o runtime (~13 MB) pode levar bem mais que carregar a lição. */
const PYODIDE_READY_TIMEOUT_MS = 60_000

test("IDE executa no navegador e verifica no servidor", async ({ page }) => {
  await login(page, STUDENT)
  await page.goto(ROUTES.lesson(await fetchLessonId(page, "python-completo-07")))
  await expect(page.getByRole("button", { name: /Executar/i })).toBeEnabled({
    timeout: PYODIDE_READY_TIMEOUT_MS,
  })
  await expect(page.getByText("Pronto", { exact: true }).first()).toBeVisible({ timeout: PYODIDE_READY_TIMEOUT_MS })
  // Mesma versão do Python do "Verificar" (CPython 3.14 no executor).
  await expect(page.getByText(`Python ${BROWSER_PYTHON_MINOR_VERSION} (Pyodide)`).first()).toBeVisible()
  await page.getByRole("button", { name: /Executar/i }).click()
  await expect(page.getByText(/executado/i).first()).toBeVisible({ timeout: PYODIDE_READY_TIMEOUT_MS })
  await expect(page.getByRole("button", { name: /Verificar/i })).toBeEnabled({
    timeout: PYODIDE_READY_TIMEOUT_MS,
  })
  await page.getByRole("button", { name: /Verificar/i }).click()
  // O esqueleto inicial não resolve o exercício: o servidor reprova com mensagens por caso.
  await expect(page.getByText(/não é o esperado|erro:|Teste/i).first()).toBeVisible({
    timeout: LESSON_LOAD_TIMEOUT_MS,
  })
})
