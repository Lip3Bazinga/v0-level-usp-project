import { expect, test } from "@playwright/test"
import { aguardarTela, entrarComo, idDaLicao } from "./ux-helpers"

/** Navegação só por teclado: foco nos diálogos, Esc, ordem do Tab e menus. */

test("caderno de notas: abre pelo teclado, prende o foco, Esc fecha e devolve o foco", async ({ page }) => {
  await entrarComo(page, "aluna")
  await page.goto("/dashboard")
  await aguardarTela(page)
  const abrir = page.getByRole("button", { name: "Abrir caderno de anotações" })
  await abrir.focus()
  await page.keyboard.press("Enter")
  const dialogo = page.getByRole("dialog", { name: "Caderno de anotações" })
  await expect(dialogo).toBeVisible()
  // O foco entra no diálogo…
  await expect.poll(() => dialogo.evaluate((d) => d.contains(document.activeElement))).toBe(true)
  // …e continua dentro dele depois de muitos Tabs (armadilha de foco correta).
  for (let i = 0; i < 25; i++) await page.keyboard.press("Tab")
  expect(await dialogo.evaluate((d) => d.contains(document.activeElement))).toBe(true)
  for (let i = 0; i < 5; i++) await page.keyboard.press("Shift+Tab")
  expect(await dialogo.evaluate((d) => d.contains(document.activeElement))).toBe(true)
  await page.keyboard.press("Escape")
  await expect(dialogo).toBeHidden()
  await expect(abrir).toBeFocused()
})

test("site público: menu 'Mais' abre com Enter, informa aria-expanded e fecha com Esc", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/")
  await aguardarTela(page)
  const mais = page.getByRole("button", { name: "Mais" })
  await expect(mais).toHaveAttribute("aria-expanded", "false")
  await mais.focus()
  await page.keyboard.press("Enter")
  await expect(mais).toHaveAttribute("aria-expanded", "true")
  await page.keyboard.press("Tab")
  await expect(page.locator("#site-nav-more a").first()).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(mais).toHaveAttribute("aria-expanded", "false")
})

test("site público: cada CTA é um único alvo de Tab (sem <button> dentro de <a>)", async ({ page }) => {
  await page.goto("/")
  await aguardarTela(page)
  expect(await page.locator("a button, button a").count()).toBe(0)
})

test("menu do celular informa aberto/fechado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const botao = page.getByRole("button", { name: "Abrir menu" })
  await expect(botao).toHaveAttribute("aria-expanded", "false")
  await botao.click()
  await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("navigation", { name: "Navegação do site" }).getByRole("link", { name: "Contato" })).toBeVisible()
})

test("login: ordem de Tab lógica e botão de mostrar senha acessível", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").focus()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByLabel("Senha", { exact: true })).toBeFocused()
  await page.keyboard.press("Tab")
  const mostrar = page.getByRole("button", { name: "Mostrar senha" })
  await expect(mostrar).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text")
})

test("lição: saída para o painel no cabeçalho e editor com nome acessível", async ({ page }) => {
  await entrarComo(page, "aluna")
  await page.goto(`/lesson/${await idDaLicao(page)}`)
  await expect(page.getByRole("link", { name: /voltar ao painel/i })).toHaveAttribute("href", "/dashboard")
  await expect(page.getByRole("textbox", { name: /Editor de código Python/ })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole("button", { name: "Restaurar código inicial" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Menu da conta" })).toBeVisible()
})

test("lição: 'Restaurar código inicial' pede confirmação e não apaga ao cancelar", async ({ page }) => {
  await entrarComo(page, "aluna")
  await page.goto(`/lesson/${await idDaLicao(page)}`)
  const editor = page.locator(".cm-content").first()
  await expect(editor).toBeVisible({ timeout: 30_000 })
  await editor.click()
  await page.keyboard.press("Control+A")
  await page.keyboard.insertText("x = 42  # meu código\n")
  let mensagem = ""
  page.once("dialog", (d) => { mensagem = d.message(); void d.dismiss() })
  await page.getByRole("button", { name: "Restaurar código inicial" }).click()
  await expect.poll(() => mensagem).toContain("Restaurar o código inicial")
  await expect(editor).toContainText("meu código")
})

test("perfil: botões de ícone com nome e compartilhar funcionando", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await entrarComo(page, "aluna")
  await page.goto("/perfil/aluna_demo")
  await aguardarTela(page)
  await expect(page.getByRole("link", { name: "Voltar ao painel" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Editar perfil" })).toBeVisible()
  await page.evaluate(() => { (navigator as { share?: unknown }).share = undefined })
  await page.getByRole("button", { name: "Compartilhar perfil" }).click()
  await expect(page.getByText("Link do perfil copiado!")).toBeVisible()
})
