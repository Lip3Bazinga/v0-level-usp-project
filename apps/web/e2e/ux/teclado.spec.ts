import { expect, test } from "@playwright/test"
import { ROUTES } from "@/lib/constants"
import { LESSON_LOAD_TIMEOUT_MS, fetchLessonId } from "../helpers"
import { signInAs, waitForPageToSettle } from "./ux-helpers"

/** Navegação só por teclado: foco nos diálogos, Esc, ordem do Tab e menus. */

/** Tabs suficientes para dar mais de uma volta pelos controles do diálogo. */
const FORWARD_TAB_PRESSES = 25
const BACKWARD_TAB_PRESSES = 5

test("caderno de notas: abre pelo teclado, prende o foco, Esc fecha e devolve o foco", async ({
  page,
}) => {
  await signInAs(page, "aluna")
  await page.goto(ROUTES.dashboard)
  await waitForPageToSettle(page)
  const openButton = page.getByRole("button", { name: "Abrir caderno de anotações" })
  await openButton.focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Caderno de anotações" })
  await expect(dialog).toBeVisible()
  const isFocusInsideDialog = () =>
    dialog.evaluate((element) => element.contains(document.activeElement))
  // O foco entra no diálogo…
  await expect.poll(isFocusInsideDialog).toBe(true)
  // …e continua dentro dele depois de muitos Tabs (armadilha de foco correta).
  for (let press = 0; press < FORWARD_TAB_PRESSES; press++) await page.keyboard.press("Tab")
  expect(await isFocusInsideDialog()).toBe(true)
  for (let press = 0; press < BACKWARD_TAB_PRESSES; press++) await page.keyboard.press("Shift+Tab")
  expect(await isFocusInsideDialog()).toBe(true)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(openButton).toBeFocused()
})

test("site público: menu 'Mais' abre com Enter, informa aria-expanded e fecha com Esc", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(ROUTES.home)
  await waitForPageToSettle(page)
  const moreButton = page.getByRole("button", { name: "Mais" })
  await expect(moreButton).toHaveAttribute("aria-expanded", "false")
  await moreButton.focus()
  await page.keyboard.press("Enter")
  await expect(moreButton).toHaveAttribute("aria-expanded", "true")
  await page.keyboard.press("Tab")
  await expect(page.locator("#site-nav-more a").first()).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(moreButton).toHaveAttribute("aria-expanded", "false")
})

test("site público: cada CTA é um único alvo de Tab (sem <button> dentro de <a>)", async ({
  page,
}) => {
  await page.goto(ROUTES.home)
  await waitForPageToSettle(page)
  expect(await page.locator("a button, button a").count()).toBe(0)
})

test("menu do celular informa aberto/fechado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(ROUTES.home)
  const menuButton = page.getByRole("button", { name: "Abrir menu" })
  await expect(menuButton).toHaveAttribute("aria-expanded", "false")
  await menuButton.click()
  await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute(
    "aria-expanded",
    "true",
  )
  await expect(
    page
      .getByRole("navigation", { name: "Navegação do site" })
      .getByRole("link", { name: "Contato" }),
  ).toBeVisible()
})

test("login: ordem de Tab lógica e botão de mostrar senha acessível", async ({ page }) => {
  await page.goto(ROUTES.login)
  await page.getByLabel("Email").focus()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByLabel("Senha", { exact: true })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("button", { name: "Mostrar senha" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text")
})

test("lição: saída para o painel no cabeçalho e editor com nome acessível", async ({ page }) => {
  await signInAs(page, "aluna")
  await page.goto(ROUTES.lesson(await fetchLessonId(page)))
  await expect(page.getByRole("link", { name: /voltar ao painel/i })).toHaveAttribute(
    "href",
    ROUTES.dashboard,
  )
  await expect(page.getByRole("textbox", { name: /Editor de código Python/ })).toBeVisible({
    timeout: LESSON_LOAD_TIMEOUT_MS,
  })
  await expect(page.getByRole("button", { name: "Restaurar código inicial" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Menu da conta" })).toBeVisible()
})

test("lição: 'Restaurar código inicial' pede confirmação e não apaga ao cancelar", async ({
  page,
}) => {
  await signInAs(page, "aluna")
  await page.goto(ROUTES.lesson(await fetchLessonId(page)))
  const editor = page.locator(".cm-content").first()
  await expect(editor).toBeVisible({ timeout: LESSON_LOAD_TIMEOUT_MS })
  await editor.click()
  await page.keyboard.press("Control+A")
  await page.keyboard.insertText("x = 42  # meu código\n")
  let confirmMessage = ""
  page.once("dialog", (dialog) => {
    confirmMessage = dialog.message()
    void dialog.dismiss()
  })
  await page.getByRole("button", { name: "Restaurar código inicial" }).click()
  await expect.poll(() => confirmMessage).toContain("Restaurar o código inicial")
  await expect(editor).toContainText("meu código")
})

test("perfil: botões de ícone com nome e compartilhar funcionando", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
  await signInAs(page, "aluna")
  await page.goto(ROUTES.profile("aluna_demo"))
  await waitForPageToSettle(page)
  await expect(page.getByRole("link", { name: "Voltar ao painel" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Editar perfil" })).toBeVisible()
  // Sem compartilhamento nativo (desktop), o botão copia o link.
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true }),
  )
  await page.getByRole("button", { name: "Compartilhar perfil" }).click()
  await expect(page.getByText("Link do perfil copiado!")).toBeVisible()
})
