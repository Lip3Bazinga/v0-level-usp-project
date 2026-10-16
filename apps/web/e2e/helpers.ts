import { expect, type Page } from "@playwright/test"

export const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD ?? "demonstracao123"
export const STUDENT = { email: "aluna@levelusp.dev", password: DEMO_PASSWORD }
export const TEACHER = { email: "professora@levelusp.dev", password: DEMO_PASSWORD }
export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "admin@levelusp.dev", password: process.env.E2E_ADMIN_PASSWORD ?? "adminLevelusp2026" }

export async function login(page: Page, user: { email: string; password: string }, next = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`)
  await page.getByLabel("Email").fill(user.email)
  await page.getByLabel("Senha", { exact: true }).fill(user.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  // Primeiro acesso do dia mostra a animação de sequência antes de redirecionar.
  const continuar = page.getByRole("button", { name: "Continuar" })
  await continuar.click({ timeout: 4_000 }).catch(() => undefined)
  await expect(page).toHaveURL(new RegExp(next.replace(/[/]/g, "\\/")), { timeout: 20_000 })
}

/** Chamadas diretas à API usando os cookies da página (mesma origem). */
export function apiPost(page: Page, path: string, data: unknown) {
  return page.request.post(`/api${path}`, { data, headers: { "x-levelusp-csrf": "1" } })
}
