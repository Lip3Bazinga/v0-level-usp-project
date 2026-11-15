import { expect, test, type Page } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { LESSON_LOAD_TIMEOUT_MS, STUDENT, fetchLessonId, login } from "./helpers"

/**
 * Lição guiada com os recursos de apresentação (diagrama, visualizador de execução, Previsão,
 * lacunas e ordenar), do começo ao fim, no navegador e contra a API e o executor reais.
 * `SHOTS_DIR=pasta` grava uma captura de tela de cada recurso.
 */
const WHILE_LESSON_SLUG = "n1-m4-01-while"
const PYODIDE_TIMEOUT_MS = 60_000
const GRADING_TIMEOUT_MS = 30_000

async function shot(page: Page, name: string): Promise<void> {
  const directory = process.env.SHOTS_DIR
  if (directory) await page.screenshot({ path: `${directory}/${name}.png` })
}

/** Abre um passo pela barra lateral (só fica habilitado depois de o anterior ser concluído). */
async function openStep(page: Page, label: string): Promise<void> {
  const stepButton = page.getByRole("button", { name: new RegExp(`^Passo ${label}`) })
  await expect(stepButton).toBeEnabled({ timeout: GRADING_TIMEOUT_MS })
  await stepButton.click()
}

test("lição guiada: diagrama, visualizador, previsão, lacunas e ordenar", async ({ page }) => {
  test.setTimeout(240_000)
  await login(page, STUDENT)
  await page.goto(ROUTES.lesson(await fetchLessonId(page, WHILE_LESSON_SLUG)))
  await expect(page.getByRole("heading", { name: "Repetição com while" })).toBeVisible({ timeout: LESSON_LOAD_TIMEOUT_MS })

  // Passo 1 · Leitura: o diagrama Mermaid vira SVG e o bloco "visualizar" roda no navegador.
  await openStep(page, "1: Um if que volta")
  const diagram = page.locator("svg").filter({ hasText: "i <= 3?" }).first()
  await diagram.scrollIntoViewIfNeeded()
  await expect(diagram).toBeVisible({ timeout: LESSON_LOAD_TIMEOUT_MS })
  await shot(page, "1-diagrama-mermaid")

  await page.getByRole("button", { name: "Visualizar" }).first().click()
  const visualizer = page.getByRole("group", { name: /Visualizador de execução/ })
  await expect(visualizer).toBeVisible({ timeout: PYODIDE_TIMEOUT_MS })
  await visualizer.getByRole("button", { name: "Último passo" }).click()
  await expect(visualizer.getByLabel("Saída até este passo")).toContainText("fim")
  await visualizer.scrollIntoViewIfNeeded()
  await shot(page, "2-visualizador-de-execucao")
  await page.getByRole("button", { name: "Continuar" }).click()

  // Passo 2 · Previsão: resposta errada não conclui; a certa conclui (comparação na API).
  await openStep(page, "2: Quantas voltas")
  const answer = page.getByPlaceholder("Digite a saída, uma linha por linha impressa")
  await answer.fill("0\n2\n4\ni vale 4")
  await page.getByRole("button", { name: /^Enviar/ }).click()
  await expect(page.getByText("Isso mesmo!")).toHaveCount(0)
  await answer.fill("0\n2\n4\ni vale 6")
  await page.getByRole("button", { name: /^Enviar/ }).click()
  await expect(page.getByText("Isso mesmo! É exatamente o que o código imprime.")).toBeVisible({ timeout: GRADING_TIMEOUT_MS })
  await shot(page, "3-previsao")

  // Passo 3 · Exercício com lacunas.
  await openStep(page, "3: De 1 a 10")
  const blanks = ["1", "<=", "+="]
  for (const [index, value] of blanks.entries()) {
    await page.getByLabel(`Lacuna ${index + 1} de ${blanks.length}`).fill(value)
  }
  await page.getByRole("button", { name: /^Verificar/ }).click()
  await expect(page.getByLabel("Ainda não")).toHaveCount(0, { timeout: GRADING_TIMEOUT_MS })
  await expect(page.getByLabel("Certo").first()).toBeVisible({ timeout: GRADING_TIMEOUT_MS })
  await shot(page, "4-lacunas")

  // Passo 4 · Exercício de ordenar (Parsons), pelo teclado: adiciona as linhas e indenta o bloco.
  await openStep(page, "4: Contagem regressiva")
  const restart = page.getByRole("button", { name: "Recomeçar" })
  if (await restart.isVisible()) await restart.click()
  await shot(page, "5-ordenar-inicio")
  for (const line of ["n = int(input())", "while n >= 1:", "print(n)", "n -= 1", 'print("Fogo!")']) {
    await page.getByRole("button", { name: `Adicionar à resposta: ${line}`, exact: true }).click()
  }
  await page.getByRole("button", { name: /^Indentar a linha 3/ }).click()
  await page.getByRole("button", { name: /^Indentar a linha 4/ }).click()
  await page.getByRole("button", { name: /^Verificar/ }).click()
  await expect(page.getByLabel("Ainda não")).toHaveCount(0, { timeout: GRADING_TIMEOUT_MS })
  await expect(page.getByLabel("Certo").first()).toBeVisible({ timeout: GRADING_TIMEOUT_MS })
  await shot(page, "6-ordenar-aprovado")
})
