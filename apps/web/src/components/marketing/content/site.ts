import { ROUTES } from "@/lib/constants"
import type { SiteLink } from "./types"

/** Repositório público do projeto: é também o canal de contato (issues). */
export const GITHUB_REPOSITORY = "github.com/Lip3Bazinga/v0-level-usp-project"
export const GITHUB_URL = `https://${GITHUB_REPOSITORY}`
export const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`
/** Autor do projeto (rodapé e metadados). */
export const PROJECT_AUTHOR = "Filipe Pio Magalhães"
export const CAMPUS_ADDRESS = "DCM/FFCLRP-USP — Ribeirão Preto, SP"

export const PRIMARY_NAV_LINKS = [
  { href: ROUTES.site.about, label: "Sobre" },
  { href: ROUTES.site.methodology, label: "Metodologia" },
  { href: ROUTES.site.tracks, label: "Trilha" },
] as const satisfies readonly SiteLink[]

export interface DescribedSiteLink extends SiteLink {
  description: string
}

/** Páginas secundárias, agrupadas no menu "Mais" do desktop. */
export const MORE_NAV_LINKS = [
  { href: ROUTES.site.team, label: "Equipe", description: "Quem constrói o LevelUSP" },
  { href: ROUTES.site.partners, label: "Parceiros", description: "Quem apoia o projeto" },
  { href: ROUTES.site.faq, label: "Perguntas frequentes", description: "Tire suas dúvidas" },
  { href: ROUTES.site.contact, label: "Contato", description: "Repositório e dúvidas" },
] as const satisfies readonly DescribedSiteLink[]

interface FooterLinkGroup {
  title: string
  links: readonly SiteLink[]
}

export const FOOTER_LINK_GROUPS = [
  {
    title: "Institucional",
    links: [
      { label: "Sobre o projeto", href: ROUTES.site.about },
      { label: "Metodologia", href: ROUTES.site.methodology },
      { label: "Equipe", href: ROUTES.site.team },
      { label: "Parceiros", href: ROUTES.site.partners },
    ],
  },
  {
    title: "Plataforma",
    links: [
      { label: "Trilha de aprendizado", href: ROUTES.site.tracks },
      { label: "Catálogo de cursos", href: ROUTES.courses },
      { label: "Ranking", href: ROUTES.leaderboard },
      { label: "IDE no navegador", href: ROUTES.ide },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Perguntas frequentes", href: ROUTES.site.faq },
      { label: "Contato", href: ROUTES.site.contact },
      { label: "Entrar", href: ROUTES.login },
      { label: "Criar conta", href: ROUTES.signup },
    ],
  },
] as const satisfies readonly FooterLinkGroup[]
