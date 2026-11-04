import { existsSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { expect, test, type Page, type Route } from "@playwright/test"
import type { Lesson, PublicProfile, SessionResponse } from "@levelusp/contracts"
import { ROUTES } from "@/lib/constants"
import { NAVIGATION_TIMEOUT_MS, fetchLessonId, readJson } from "../helpers"

/*
 * Ataques à web (Next.js) contra a pilha completa: cabeçalhos e clickjacking,
 * source maps, bypass de middleware (CVE-2025-29927), Flight/Server Actions
 * (CVE-2025-55182 "React2Shell"), SSRF no otimizador de imagens, open redirect
 * no login, CSRF de outra origem e XSS armazenado no conteúdo renderizado.
 */

const CSRF_HEADERS = { "x-levelusp-csrf": "1" }
const PASSWORD = "senhaForte123"
/** Origem "do atacante", servida pelo próprio Playwright (nunca sai para a internet). */
const EVIL_ORIGIN = "http://evil.levelusp.test"
const XSS_FLAG = "__levelusp_xss"

interface Account {
  email: string
  password: string
  username: string
}

/** Cria uma conta nova pela API (cookie fica no contexto da página). */
async function signUp(page: Page, fullName = "Aluna Segurança"): Promise<Account> {
  const email = `seg+${Date.now()}${Math.floor(Math.random() * 1e6)}@levelusp.dev`
  const response = await page.request.post("/api/auth/sign-up", { data: { email, password: PASSWORD, full_name: fullName }, headers: CSRF_HEADERS })
  expect(response.status()).toBe(201)
  const { user } = await readJson<SessionResponse>(response)
  return { email, password: PASSWORD, username: user.username ?? "" }
}

/** Falha o teste se algum script injetado rodar (alert, confirm ou a marca global). */
function trapXss(page: Page): () => Promise<void> {
  const dialogs: string[] = []
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.message())
    void dialog.dismiss()
  })
  return async () => {
    const flagged = await page.evaluate((flag) => flag in window, XSS_FLAG)
    expect(dialogs, "diálogo aberto por script injetado").toEqual([])
    expect(flagged, "script injetado executou").toBe(false)
  }
}

const HTML_XSS = [
  "<p>Conteúdo</p>",
  `<img src=x onerror="window.${XSS_FLAG}=1;alert(1)">`,
  `<svg><animate onbegin="window.${XSS_FLAG}=1" attributeName=x dur=1s>`,
  `<a id="link-js" href="javascript:window.${XSS_FLAG}=1">clique</a>`,
  `<iframe srcdoc="<script>parent.${XSS_FLAG}=1</script>"></iframe>`,
  `<math><mtext><table><mglyph><style><img src=x onerror="window.${XSS_FLAG}=1"></style></mglyph></table></mtext></math>`,
  `<form action="javascript:window.${XSS_FLAG}=1"><button id="xss-submit">ok</button></form>`,
].join("")

const MARKDOWN_XSS = [
  "# Título",
  `<img src=x onerror="window.${XSS_FLAG}=1">`,
  `[clique](javascript:window.${XSS_FLAG}=1)`,
  `![img](javascript:window.${XSS_FLAG}=1)`,
  `<script>window.${XSS_FLAG}=1</script>`,
].join("\n\n")

test.describe("cabeçalhos e enquadramento", () => {
  test("páginas saem com CSP, anti-clickjacking, nosniff e sem X-Powered-By", async ({ request }) => {
    const response = await request.get("/")
    const headers = response.headers()
    expect(headers["content-security-policy"]).toMatch(/frame-ancestors 'none'/)
    expect(headers["content-security-policy"]).toMatch(/object-src 'none'/)
    expect(headers["content-security-policy"]).toMatch(/base-uri 'self'/)
    expect(headers["content-security-policy"]).toMatch(/form-action 'self'/)
    expect(headers["x-frame-options"]).toBe("DENY")
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(headers["x-xss-protection"]).toBe("0")
    expect(headers["x-powered-by"]).toBeUndefined()
  })

  test("login não pode ser enquadrado por outro site (clickjacking)", async ({ page, baseURL }) => {
    await page.route(`${EVIL_ORIGIN}/**`, (route) => route.fulfill({ contentType: "text/html", body: `<iframe id="alvo" src="${baseURL}${ROUTES.login}" width="800" height="600"></iframe>` }))
    await page.goto(`${EVIL_ORIGIN}/`)
    // Bloqueado pelo navegador (frame-ancestors/X-Frame-Options), o iframe vira página de erro.
    await expect.poll(() => page.frames().find((frame) => frame !== page.mainFrame())?.url() ?? "", { timeout: NAVIGATION_TIMEOUT_MS }).toMatch(/^chrome-error:/)
    await expect(page.frameLocator("#alvo").locator("input[type=email]")).toHaveCount(0)
  })

  test("source maps do cliente não são publicados", async ({ page, request }) => {
    await page.goto("/")
    const scripts = await page.locator("script[src*='/_next/static/']").evaluateAll((elements) => elements.map((element) => element.getAttribute("src") ?? ""))
    expect(scripts.length).toBeGreaterThan(0)
    for (const script of scripts) {
      const source = await request.get(script)
      expect(await source.text()).not.toMatch(/\/\/[#@] sourceMappingURL=(?!data:)/)
      const map = await request.get(`${script}.map`)
      if (map.status() === 200) expect(await map.text()).not.toMatch(/"sources"\s*:\s*\[\s*"/)
    }
  })
})

test.describe("vulnerabilidades conhecidas do Next/React", () => {
  test("CVE-2025-29927: x-middleware-subrequest não pula o middleware de rotas protegidas", async ({ request }) => {
    for (const value of ["middleware", "src/middleware", "middleware:middleware:middleware:middleware:middleware", "src/middleware:src/middleware:src/middleware:src/middleware:src/middleware"]) {
      for (const route of [ROUTES.dashboard, "/admin", "/teacher"]) {
        const response = await request.get(route, { headers: { "x-middleware-subrequest": value }, maxRedirects: 0 })
        expect(response.status(), `${route} com ${value}`).toBe(307)
        expect(response.headers().location).toMatch(/^\/login\?next=/)
      }
    }
  })

  test("CVE-2025-55182 (React2Shell): carga Flight maliciosa numa Server Action não executa código", async ({ request, baseURL }) => {
    const marker = path.join(tmpdir(), `levelusp-react2shell-${Date.now()}`)
    const prefix = `process.mainModule.require("fs").writeFileSync(${JSON.stringify(marker)},"x");`
    const chunk0 = JSON.stringify({
      then: "$1:__proto__:then",
      status: "resolved_model",
      reason: -1,
      value: '{"then":"$B1337"}',
      _response: { _prefix: prefix, _chunks: "$Q2", _formData: { get: "$1:constructor:constructor" } },
    })
    for (const action of ["x", "7f0000000000000000000000000000000000000000"]) {
      const response = await request.post("/", {
        headers: { "Next-Action": action, Accept: "text/x-component" },
        multipart: { "0": chunk0, "1": '"$@0"', "2": "[]" },
      })
      expect(response.status()).toBeGreaterThanOrEqual(400)
      expect(response.status()).toBeLessThan(500)
    }
    // O servidor segue de pé e nada foi gravado (só conferível com a pilha local).
    expect((await request.get("/")).status()).toBe(200)
    if (baseURL && /localhost|127\.0\.0\.1/.test(baseURL)) expect(existsSync(marker)).toBe(false)
  })

  test("otimizador de imagens não busca URLs externas (SSRF)", async ({ request }) => {
    for (const url of ["http://169.254.169.254/latest/meta-data/", "http://127.0.0.1:4000/api/health/ready", "//evil.example/x.png", "https://evil.example/x.png", "file:///etc/passwd"]) {
      const response = await request.get(`/_next/image?url=${encodeURIComponent(url)}&w=64&q=75`)
      expect(response.status(), url).toBe(400)
    }
  })

  test("rewrite /api não vaza o endereço interno da API", async ({ request }) => {
    const response = await request.get("/api/rota-que-nao-existe")
    const text = `${JSON.stringify(response.headers())}${await response.text()}`
    expect(text).not.toMatch(/api:4000|127\.0\.0\.1:4\d{3}|localhost:4\d{3}/)
  })
})

test.describe("sessão, redirecionamento e CSRF", () => {
  test("open redirect: next=/%09/site-externo depois do login fica na origem", async ({ page, baseURL }) => {
    const account = await signUp(page)
    await page.context().clearCookies()
    let isEvilRequested = false
    await page.route("**://evil.example/**", (route) => {
      isEvilRequested = true
      return route.abort()
    })
    await page.goto(`${ROUTES.login}?next=${encodeURIComponent("/\t/evil.example/phishing")}`)
    await page.getByLabel("Email").fill(account.email)
    await page.getByLabel("Senha", { exact: true }).fill(account.password)
    await page.getByRole("button", { name: "Entrar" }).click()
    const continueButton = page.getByRole("button", { name: "Continuar", exact: true })
    await Promise.race([page.waitForURL(/\/dashboard/, { timeout: NAVIGATION_TIMEOUT_MS }), continueButton.waitFor({ timeout: NAVIGATION_TIMEOUT_MS }).then(() => continueButton.click())])
    await page.waitForLoadState("domcontentloaded")
    expect(isEvilRequested).toBe(false)
    expect(new URL(page.url()).origin).toBe(new URL(baseURL ?? "").origin)
  })

  test("cookie de sessão é HttpOnly (JavaScript da página não o lê)", async ({ page }) => {
    await page.goto("/")
    await signUp(page)
    await page.goto(ROUTES.dashboard)
    expect(await page.evaluate(() => document.cookie)).not.toContain("lvl_session")
    const cookie = (await page.context().cookies()).find((candidate) => candidate.name === "lvl_session")
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.sameSite).toBe("Lax")
  })

  test("CSRF: site do atacante não cria nota na conta da vítima (formulário nem fetch)", async ({ page, baseURL }) => {
    await page.goto("/")
    await signUp(page)
    const target = `${baseURL}/api/me/notes`
    await page.route(`${EVIL_ORIGIN}/**`, (route: Route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<form id="f" method="POST" action="${target}" enctype="text/plain"><input name='{"content":"csrf","x":"' value='"}'></form>
          <script>
            window.fetchResult = fetch(${JSON.stringify(target)}, { method: "POST", credentials: "include", headers: { "content-type": "application/json", "x-levelusp-csrf": "1" }, body: '{"content":"csrf-fetch"}' })
              .then((r) => "status " + r.status).catch((e) => "bloqueado: " + e.name)
          </script>`,
      }),
    )
    await page.goto(`${EVIL_ORIGIN}/`)
    expect(await page.evaluate("window.fetchResult")).toMatch(/^bloqueado/)
    // Espera a navegação do formulário terminar; senão o goto("/") seguinte é abortado por ela.
    await Promise.all([
      page.waitForURL(target),
      page.evaluate(() => (document.getElementById("f") as HTMLFormElement).submit()),
    ])
    await page.goto("/")
    const notes = await page.request.get("/api/me/notes")
    expect(await notes.text()).not.toContain("csrf")
  })
})

test.describe("XSS armazenado no que a web renderiza", () => {
  test("conteúdo de lição (HTML e Markdown) vindo da API não executa script, mesmo sem o filtro do servidor", async ({ page }) => {
    await page.goto("/")
    await signUp(page)
    const lessonId = await fetchLessonId(page)
    const assertNoXss = trapXss(page)
    for (const [content, visibleText] of [[HTML_XSS, "Conteúdo"], [MARKDOWN_XSS, "Título"]] as const) {
      // Simula conteúdo legado/importado que nunca passou pelo sanitize-html da API: só o DOMPurify protege.
      await page.route(`**/api/lessons/${lessonId}`, async (route) => {
        const response = await route.fetch()
        const lesson = await readJson<Lesson>(response)
        await route.fulfill({ response, json: { ...lesson, content_markdown: content } })
      })
      await page.goto(ROUTES.lesson(lessonId))
      // Controle positivo: o conteúdo adulterado foi de fato renderizado.
      await expect(page.getByText(visibleText, { exact: true }).first()).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS })
      await page.waitForTimeout(1_000)
      await expect(page.locator("[onerror], [onload], [onbegin], iframe[srcdoc], a[href^='javascript:' i], form[action^='javascript:' i]")).toHaveCount(0)
      await page.unroute(`**/api/lessons/${lessonId}`)
    }
    await assertNoXss()
  })

  test("nome e bio com HTML aparecem como texto no perfil público e no ranking", async ({ page }) => {
    await page.goto("/")
    const payload = `<img src=x onerror="window.${XSS_FLAG}=1">`
    const account = await signUp(page, payload)
    expect((await page.request.patch("/api/me/profile", { data: { bio: `<script>window.${XSS_FLAG}=1</script>${payload}` }, headers: CSRF_HEADERS })).status()).toBe(200)
    const assertNoXss = trapXss(page)
    await page.goto(ROUTES.profile(account.username))
    await expect(page.getByText(payload).first()).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS })
    await page.route("**/api/leaderboard*", async (route) => {
      const response = await route.fetch()
      const ranking = await readJson<PublicProfile[]>(response)
      const [first, ...rest] = ranking
      await route.fulfill({ response, json: first ? [{ ...first, full_name: payload }, ...rest] : ranking })
    })
    await page.goto("/leaderboard")
    await expect(page.getByText(payload).first()).toBeVisible({ timeout: NAVIGATION_TIMEOUT_MS })
    await expect(page.locator("[onerror]")).toHaveCount(0)
    await assertNoXss()
  })
})
