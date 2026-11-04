import { expect, test } from "@playwright/test"
import { aguardarTela, entrarComo, idDaLicao, idDoCurso, larguraExcedente, type Perfil } from "./ux-helpers"

/** Sem rolagem horizontal nos 4 tamanhos de tela de referência. */
const VIEWPORTS = [
  { nome: "desktop 1440×900", width: 1440, height: 900 },
  { nome: "tablet paisagem 1024×768", width: 1024, height: 768 },
  { nome: "tablet retrato 768×1024", width: 768, height: 1024 },
  { nome: "celular 390×844", width: 390, height: 844 },
]

const ROTAS: { perfil: Perfil; rotas: (string | "CURSO" | "LICAO")[] }[] = [
  { perfil: "visitante", rotas: ["/", "/sobre", "/trilhas", "/metodologia", "/impacto", "/equipe", "/parceiros", "/faq", "/contato", "/login", "/signup", "/esqueci-senha", "/certificado/LVL-0000-0000", "/rota-que-nao-existe"] },
  { perfil: "aluna", rotas: ["/dashboard", "/cursos", "CURSO", "LICAO", "/leaderboard", "/notas", "/settings", "/perfil/aluna_demo"] },
  { perfil: "professora", rotas: ["/teacher", "CURSO_EDITOR", "/teacher/edit/new"] },
  { perfil: "admin", rotas: ["/admin"] },
]

for (const vp of VIEWPORTS) {
  for (const { perfil, rotas } of ROTAS) {
    test(`sem rolagem horizontal — ${perfil} — ${vp.nome}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await entrarComo(page, perfil)
      const excedentes: string[] = []
      for (const r of rotas) {
        const rota =
          r === "CURSO" ? `/cursos/${await idDoCurso(page)}`
          : r === "CURSO_EDITOR" ? `/teacher/curso/${await idDoCurso(page)}`
          : r === "LICAO" ? `/lesson/${await idDaLicao(page)}`
          : r
        await page.goto(rota)
        await aguardarTela(page)
        const extra = await larguraExcedente(page)
        if (extra > 1) excedentes.push(`${rota} (+${extra}px)`)
      }
      expect(excedentes).toEqual([])
    })
  }
}

test("menu do painel: navegação completa no desktop, barra inferior até 1023px", async ({ page }) => {
  await entrarComo(page, "aluna")
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto("/dashboard")
  await aguardarTela(page)
  const navs = page.getByRole("navigation", { name: "Navegação principal" })
  await expect(navs.filter({ visible: true })).toHaveCount(1)
  // Em 768px a barra visível é a inferior (fixa no rodapé).
  const box = await navs.filter({ visible: true }).boundingBox()
  expect(box!.y).toBeGreaterThan(900)
  await page.setViewportSize({ width: 1440, height: 900 })
  const boxDesk = await navs.filter({ visible: true }).boundingBox()
  expect(boxDesk!.y).toBeLessThan(80)
})

test("IDE no celular: abas Aprender/Código/Console/Arquivos e botão de notas fora do caminho", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await entrarComo(page, "aluna")
  await page.goto(`/lesson/${await idDaLicao(page)}`)
  await aguardarTela(page)
  for (const aba of ["Aprender", "Código", "Console", "Arquivos"]) {
    await expect(page.getByRole("button", { name: aba }).last()).toBeVisible()
  }
  // O botão flutuante de notas cobria a aba "Arquivos" e o "Verificar".
  await expect(page.getByRole("button", { name: "Abrir caderno de anotações" })).toBeHidden()
  await page.getByRole("button", { name: "Código" }).last().click()
  await expect(page.locator(".cm-content:visible")).toHaveCount(1)
})
