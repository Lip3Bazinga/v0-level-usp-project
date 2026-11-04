import AxeBuilder from "@axe-core/playwright"
import { expect, type Page } from "@playwright/test"
import { ADMIN, STUDENT, TEACHER } from "../helpers"

export type Perfil = "visitante" | "aluna" | "professora" | "admin"

const USERS = { aluna: STUDENT, professora: TEACHER, admin: ADMIN } as const

/** Login direto pela API (mais rápido que a tela; o cookie fica no contexto da página). */
export async function entrarComo(page: Page, perfil: Perfil) {
  if (perfil === "visitante") return
  const res = await page.request.post("/api/auth/sign-in", {
    data: USERS[perfil],
    headers: { "x-levelusp-csrf": "1" },
  })
  expect(res.ok(), `login de ${perfil}`).toBeTruthy()
}

export async function idDoCurso(page: Page): Promise<string> {
  const cursos = await (await page.request.get("/api/courses")).json()
  return cursos[0].id
}

export async function idDaLicao(page: Page, slug = "python-completo-02"): Promise<string> {
  const licoes = await (await page.request.get("/api/lessons/summaries")).json()
  return licoes.find((l: { slug: string }) => l.slug === slug).id
}

/** Espera a tela "assentar" (dados carregados, animações de entrada concluídas). */
export async function aguardarTela(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(600)
}

/**
 * Regras do axe que DEVEM estar zeradas em todas as telas principais.
 * (Contraste é verificado à parte, só nas telas já corrigidas — ver a11y.spec.ts.)
 */
export const REGRAS_ESTRUTURAIS = [
  "button-name",
  "link-name",
  "label",
  "select-name",
  "input-button-name",
  "aria-input-field-name",
  "aria-toggle-field-name",
  "aria-allowed-attr",
  "aria-prohibited-attr",
  "aria-required-attr",
  "aria-valid-attr-value",
  "aria-roles",
  "nested-interactive",
  "image-alt",
  "html-has-lang",
  "html-lang-valid",
  "document-title",
  "duplicate-id-aria",
  "list",
  "listitem",
  "target-size",
]

export async function violacoes(page: Page, regras: string[]) {
  let builder = new AxeBuilder({ page }).withRules(regras)
  // Números/ornamentos marcados aria-hidden são decoração (WCAG 1.4.3 isenta texto decorativo).
  if (regras.includes("color-contrast")) builder = builder.exclude('[aria-hidden="true"]')
  const r = await builder.analyze()
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)
}

/** Largura do documento > viewport = rolagem horizontal indesejada. */
export async function larguraExcedente(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
}
