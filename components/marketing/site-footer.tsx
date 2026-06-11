"use client"

import Link from "next/link"
import { Rocket, Github, Mail, GraduationCap, MapPin } from "lucide-react"

const FOOTER_LINKS = [
  {
    title: "Institucional",
    links: [
      { label: "Sobre o projeto", href: "/sobre" },
      { label: "Metodologia", href: "/metodologia" },
      { label: "Impacto", href: "/impacto" },
      { label: "Equipe", href: "/equipe" },
      { label: "Parceiros", href: "/parceiros" },
    ],
  },
  {
    title: "Plataforma",
    links: [
      { label: "Trilhas de aprendizado", href: "/trilhas" },
      { label: "Catálogo de cursos", href: "/cursos" },
      { label: "Ranking", href: "/leaderboard" },
      { label: "IDE no navegador", href: "/ide" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Perguntas frequentes", href: "/faq" },
      { label: "Contato", href: "/contato" },
      { label: "Entrar", href: "/login" },
      { label: "Criar conta", href: "/signup" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7C3AED]">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div className="leading-tight">
                <span className="block text-xl font-bold text-[#4C1D95]">LevelUSP</span>
                <span className="flex items-center gap-1 text-xs text-[#7C3AED]">
                  <GraduationCap className="h-3 w-3" /> Iniciativa da USP
                </span>
              </div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-gray-600">
              Plataforma gratuita e gamificada de ensino de programação, desenvolvida na
              Universidade de São Paulo para democratizar a computação em todo o Brasil.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 text-[#7C3AED]" />
              Cidade Universitária — São Paulo, SP
            </div>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED] transition-colors hover:bg-[#E9D5FF]"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="mailto:contato@levelusp.org.br"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED] transition-colors hover:bg-[#E9D5FF]"
                aria-label="E-mail"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-sm font-semibold text-[#4C1D95]">{col.title}</h3>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-gray-600 transition-colors hover:text-[#7C3AED]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} LevelUSP — Universidade de São Paulo. Conteúdo aberto e gratuito.
          </p>
          <p className="text-sm font-medium text-[#7C3AED]">100% gratuito para todos os brasileiros</p>
        </div>
      </div>
    </footer>
  )
}
