import { ROUTES } from "@/lib/constants"
import type { SiteLink } from "./types"

export const CONTACT_EMAIL = "contato@levelusp.org.br"
export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_EMAIL}`
export const GITHUB_URL = "https://github.com"
export const CAMPUS_ADDRESS = "Cidade Universitária — São Paulo, SP"

export const PRIMARY_NAV_LINKS = [
  { href: ROUTES.site.about, label: "Sobre" },
  { href: ROUTES.site.methodology, label: "Metodologia" },
  { href: ROUTES.site.tracks, label: "Trilhas" },
  { href: ROUTES.site.impact, label: "Impacto" },
] as const satisfies readonly SiteLink[]

export interface DescribedSiteLink extends SiteLink {
  description: string
}

/** Páginas secundárias, agrupadas no menu "Mais" do desktop. */
export const MORE_NAV_LINKS = [
  { href: ROUTES.site.team, label: "Equipe", description: "Quem constrói o LevelUSP" },
  { href: ROUTES.site.partners, label: "Parceiros", description: "Instituições que apoiam" },
  { href: ROUTES.site.faq, label: "Perguntas frequentes", description: "Tire suas dúvidas" },
  { href: ROUTES.site.contact, label: "Contato", description: "Fale com a equipe" },
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
      { label: "Impacto", href: ROUTES.site.impact },
      { label: "Equipe", href: ROUTES.site.team },
      { label: "Parceiros", href: ROUTES.site.partners },
    ],
  },
  {
    title: "Plataforma",
    links: [
      { label: "Trilhas de aprendizado", href: ROUTES.site.tracks },
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
