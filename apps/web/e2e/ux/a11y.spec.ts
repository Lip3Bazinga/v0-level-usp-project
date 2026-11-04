import { expect, test } from "@playwright/test"
import { aguardarTela, entrarComo, idDaLicao, idDoCurso, REGRAS_ESTRUTURAIS, violacoes, type Perfil } from "./ux-helpers"

/**
 * Regressão de acessibilidade (WCAG 2.2 AA) com axe-core nas telas principais.
 * - Regras estruturais (nomes acessíveis, rótulos, ARIA, interativo aninhado, alvo mínimo)
 *   devem estar zeradas em todas as telas.
 * - Contraste é exigido nas telas cujo contraste já foi corrigido (CONTRASTE_OK).
 */

type Tela = { perfil: Perfil; rota: string; contraste?: boolean }

/** Rotas com id do seed: resolvidas na hora pela API. */
async function resolver(page: import("@playwright/test").Page, rota: string) {
  if (rota === "/cursos/:id") return `/cursos/${await idDoCurso(page)}`
  if (rota === "/cursos/:id/prova") return `/cursos/${await idDoCurso(page)}/prova`
  if (rota === "/lesson/:id") return `/lesson/${await idDaLicao(page)}`
  return rota
}

const TELAS: Tela[] = [
  { perfil: "visitante", rota: "/", contraste: true },
  { perfil: "visitante", rota: "/login", contraste: true },
  { perfil: "visitante", rota: "/signup", contraste: true },
  { perfil: "visitante", rota: "/esqueci-senha", contraste: true },
  { perfil: "visitante", rota: "/redefinir-senha", contraste: true },
  { perfil: "visitante", rota: "/impacto", contraste: true },
  { perfil: "visitante", rota: "/certificado/LVL-0000-0000", contraste: true },
  { perfil: "visitante", rota: "/rota-que-nao-existe", contraste: true },
  { perfil: "aluna", rota: "/dashboard" },
  { perfil: "aluna", rota: "/cursos", contraste: true },
  { perfil: "aluna", rota: "/cursos/:id" },
  { perfil: "aluna", rota: "/cursos/:id/prova", contraste: true },
  { perfil: "aluna", rota: "/lesson/:id" },
  { perfil: "aluna", rota: "/leaderboard" },
  { perfil: "aluna", rota: "/notas", contraste: true },
  { perfil: "aluna", rota: "/settings", contraste: true },
  { perfil: "aluna", rota: "/perfil/aluna_demo", contraste: true },
  { perfil: "professora", rota: "/teacher" },
  { perfil: "professora", rota: "/teacher/edit/new" },
  { perfil: "admin", rota: "/admin" },
]

for (const tela of TELAS) {
  test(`axe sem violações estruturais — ${tela.perfil} ${tela.rota}`, async ({ page }) => {
    await entrarComo(page, tela.perfil)
    const rota = await resolver(page, tela.rota)
    await page.goto(rota)
    await aguardarTela(page)
    expect(await violacoes(page, REGRAS_ESTRUTURAIS)).toEqual([])
    if (tela.contraste) expect(await violacoes(page, ["color-contrast"])).toEqual([])
  })
}

test("documento em pt-BR com título e landmark principal", async ({ page }) => {
  for (const rota of ["/", "/login", "/signup", "/cursos"]) {
    await page.goto(rota)
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR")
    await expect(page).toHaveTitle(/LevelUSP/)
  }
})

test("prefers-reduced-motion: confete e animações em loop desligados", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", baseURL: test.info().project.use.baseURL })
  const page = await ctx.newPage()
  await page.goto("/")
  await aguardarTela(page)
  // Tailwind animate-pulse/bounce/ping e o gradiente animado ficam parados.
  const animando = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".animate-pulse, .animate-bounce, .animate-ping, .gradient-text"))
      .filter((el) => getComputedStyle(el).animationName !== "none").length,
  )
  expect(animando).toBe(0)
  await ctx.close()
})
