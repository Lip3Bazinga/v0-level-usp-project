import { expect, test } from "@playwright/test"
import { HTTP_STATUS } from "@/lib/api/client"
import { ROUTES } from "@/lib/constants"

test("página inicial carrega", async ({ page }) => {
  const response = await page.goto(ROUTES.home)
  expect(response?.status()).toBeLessThan(400)
  await expect(page).toHaveTitle(/LevelUSP/i)
})

test("rota protegida sem sessão leva ao login preservando o destino", async ({ page }) => {
  await page.goto(ROUTES.dashboard)
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/)
})

test("API responde pelo mesmo domínio e está saudável", async ({ request }) => {
  const response = await request.get("/api/health/ready")
  expect(response.ok()).toBeTruthy()
  expect(await response.json()).toMatchObject({ checks: { db: true, runner: true } })
})

test("API exige o cabeçalho anti-CSRF", async ({ request }) => {
  const response = await request.post("/api/auth/sign-in", {
    data: { email: "x@y.z", password: "x" },
  })
  expect(response.status()).toBe(HTTP_STATUS.FORBIDDEN)
})

test("verificação pública de certificado inexistente", async ({ page }) => {
  await page.goto(ROUTES.certificate("LVL-0000-0000"))
  await expect(page.getByText(/não (foi )?encontrad|inválid/i).first()).toBeVisible()
})
