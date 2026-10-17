import { expect, type Page } from "@playwright/test"

export interface Credentials {
  email: string
  password: string
}

export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "demonstracao123"
export const STUDENT: Credentials = { email: "aluna@levelusp.dev", password: DEMO_PASSWORD }
export const TEACHER: Credentials = { email: "professora@levelusp.dev", password: DEMO_PASSWORD }
export const ADMIN: Credentials = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@levelusp.dev",
  password: process.env.E2E_ADMIN_PASSWORD ?? "adminLevelusp2026",
}

const NAVIGATION_TIMEOUT_MS = 20_000

export async function login(page: Page, user: Credentials, next = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Senha", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  // O primeiro acesso do dia mostra a animação de sequência e só redireciona
  // depois de "Continuar". Espera o que vier primeiro: o redirecionamento ou o modal.
  const target = new RegExp(next.replace(/[/]/g, "\\/"))
  const continueButton = page.getByRole("button", { name: "Continuar", exact: true })
  const outcome = await Promise.race([
    page.waitForURL(target, { timeout: NAVIGATION_TIMEOUT_MS }).then(() => "redirect" as const),
    continueButton.waitFor({ state: "visible", timeout: NAVIGATION_TIMEOUT_MS }).then(() => "streak" as const),
  ])
  if (outcome === "streak") await continueButton.click()
  await expect(page).toHaveURL(target, { timeout: NAVIGATION_TIMEOUT_MS })
}

/** Chamada direta à API com os cookies da página (mesma origem) e o cabeçalho anti-CSRF. */
export function apiPost(page: Page, path: string, data: unknown) {
  return page.request.post(`/api${path}`, { data, headers: { "x-levelusp-csrf": "1" } })
}
