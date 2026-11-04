import { expect, test, type Page } from "@playwright/test"
import { aguardarTela, entrarComo, idDaLicao } from "./ux-helpers"

/** Simula a API fora do ar (500) em tudo, menos a sessão (/auth/me). */
async function apiComFalha(page: Page, status = 500) {
  await page.route("**/api/**", (route) => {
    if (route.request().url().includes("/api/auth/me")) return route.continue()
    return route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ statusCode: status, code: "INTERNAL", message: "Erro interno. Tente novamente." }) })
  })
}

test.describe("falha da API não vira 'lista vazia'", () => {
  for (const { rota, mensagem } of [
    { rota: "/cursos", mensagem: /Não foi possível carregar os cursos/ },
    { rota: "/leaderboard", mensagem: /Não foi possível carregar o ranking/ },
    { rota: "/notas", mensagem: /Não foi possível carregar suas anotações/ },
  ]) {
    test(`${rota}: mostra erro e "Tentar novamente" que recupera`, async ({ page }) => {
      await entrarComo(page, "aluna")
      await apiComFalha(page)
      await page.goto(rota)
      const alerta = page.getByRole("alert").filter({ hasText: mensagem })
      await expect(alerta).toBeVisible()
      await expect(page.getByText(/Nenhum curso encontrado|Nenhum estudante ainda|Nenhuma anotação ainda/)).toHaveCount(0)
      // A API volta: "Tentar novamente" carrega os dados sem recarregar a página.
      await page.unrouteAll({ behavior: "ignoreErrors" })
      await page.getByRole("button", { name: "Tentar novamente" }).click()
      await expect(alerta).toHaveCount(0)
    })
  }

  test("lição: erro de rede diferente de 'lição não encontrada', com nova tentativa", async ({ page }) => {
    await entrarComo(page, "aluna")
    const id = await idDaLicao(page)
    await apiComFalha(page)
    await page.goto(`/lesson/${id}`)
    await expect(page.getByRole("heading", { name: "Não foi possível carregar a lição" })).toBeVisible()
    await page.unrouteAll({ behavior: "ignoreErrors" })
    await page.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page.getByRole("button", { name: /Executar/ }).first()).toBeVisible({ timeout: 30_000 })
  })

  test("lição inexistente mostra 'Lição não encontrada' sem botão de tentar de novo", async ({ page }) => {
    await entrarComo(page, "aluna")
    await page.goto("/lesson/00000000-0000-4000-8000-000000000000")
    await expect(page.getByRole("heading", { name: "Lição não encontrada" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toHaveCount(0)
  })
})

test("404: página própria com saída para o início e para o painel", async ({ page }) => {
  const res = await page.goto("/rota-que-nao-existe")
  expect(res?.status()).toBe(404)
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible()
  await expect(page.getByRole("link", { name: /Página inicial/ })).toHaveAttribute("href", "/")
  await expect(page.getByRole("link", { name: /Ir para o painel/ })).toHaveAttribute("href", "/dashboard")
})

test("sessão expirada no meio da lição leva ao login preservando o destino", async ({ page, context }) => {
  await entrarComo(page, "aluna")
  const id = await idDaLicao(page)
  await page.goto(`/lesson/${id}`)
  await expect(page.getByRole("button", { name: /Executar/ }).first()).toBeVisible({ timeout: 30_000 })
  await context.clearCookies()
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/)
})

test("cadastro: validação de senha em pt-BR e duplo clique cria uma conta só", async ({ page }) => {
  const email = `ux+${Date.now()}@levelusp.dev`
  await page.goto("/signup")
  await page.getByLabel("Nome completo").fill("Aluna UX")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Senha", { exact: true }).fill("abcdefghij")
  await page.getByRole("button", { name: /Criar Conta/i }).click()
  await expect(page.getByRole("alert").filter({ hasText: /número/ })).toBeVisible()
  await expect(page.locator("#signup-password-hint")).toContainText("Mínimo de 10 caracteres")
  await page.getByLabel("Senha", { exact: true }).fill("senhaForte123")
  const respostas: number[] = []
  page.on("response", (r) => { if (r.url().includes("/api/auth/sign-up")) respostas.push(r.status()) })
  await page.getByRole("button", { name: /Criar Conta/i }).dblclick()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  expect(respostas.filter((s) => s < 400)).toHaveLength(1)
})

test("rede lenta (3G): a tela de login aparece e o formulário funciona", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page)
  await cdp.send("Network.enable")
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (750 * 1024) / 8, uploadThroughput: (250 * 1024) / 8 })
  await page.goto("/login", { timeout: 60_000 })
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible({ timeout: 60_000 })
  await page.getByLabel("Email").fill("aluna@levelusp.dev")
  await page.getByLabel("Senha", { exact: true }).fill("senhaErrada999")
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page.getByRole("button", { name: /Entrando/ })).toBeDisabled()
  await expect(page.getByRole("alert").filter({ hasText: /incorretos/i })).toBeVisible({ timeout: 30_000 })
})

test("painel do admin: falha da API mostra erro com nova tentativa", async ({ page }) => {
  await entrarComo(page, "admin")
  await apiComFalha(page)
  await page.goto("/admin")
  await expect(page.getByText("Não foi possível carregar o painel")).toBeVisible()
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()
})

test("admin: card de 'saúde da plataforma' com números fictícios foi removido", async ({ page }) => {
  await entrarComo(page, "admin")
  await page.goto("/admin")
  await aguardarTela(page)
  await expect(page.getByText(/uptime · 30d/)).toHaveCount(0)
  await expect(page.getByText(/conclusãoões/)).toHaveCount(0)
})
