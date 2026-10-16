import { expect, test } from "@playwright/test"

test("página inicial carrega", async ({ page }) => {
  const res = await page.goto("/")
  expect(res?.status()).toBeLessThan(400)
  await expect(page).toHaveTitle(/LevelUSP/i)
})

test("rota protegida sem sessão leva ao login preservando o destino", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/)
})

test("API responde pelo mesmo domínio e está saudável", async ({ request }) => {
  const res = await request.get("/api/health/ready")
  expect(res.ok()).toBeTruthy()
  expect(await res.json()).toMatchObject({ checks: { db: true, runner: true } })
})

test("API exige o cabeçalho anti-CSRF", async ({ request }) => {
  const res = await request.post("/api/auth/sign-in", { data: { email: "x@y.z", password: "x" } })
  expect(res.status()).toBe(403)
})

test("verificação pública de certificado inexistente", async ({ page }) => {
  await page.goto("/certificado/LVL-0000-0000")
  await expect(page.getByText(/não (foi )?encontrad|inválid/i).first()).toBeVisible()
})
