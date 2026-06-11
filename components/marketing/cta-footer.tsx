"use client"

import Link from "next/link"
import { Reveal } from "./motion-primitives"
import { Rocket, Play, Github, Mail, GraduationCap } from "lucide-react"

const FOOTER_LINKS = [
  {
    title: "Plataforma",
    links: [
      { label: "Cursos", href: "/cursos" },
      { label: "Ranking", href: "/leaderboard" },
      { label: "IDE no navegador", href: "/ide" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { label: "Nossa missão", href: "#missao" },
      { label: "Metodologia", href: "#metodo" },
      { label: "Base científica", href: "#ciencia" },
    ],
  },
  {
    title: "Conta",
    links: [
      { label: "Entrar", href: "/login" },
      { label: "Cadastrar", href: "/signup" },
    ],
  },
]

export function CtaFooter() {
  return (
    <>
      {/* Final CTA */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="glass-purple relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
              <div className="aurora-bg opacity-70" aria-hidden />
              <div className="relative">
                <h2 className="text-balance text-4xl font-bold text-[#4C1D95] sm:text-5xl">
                  Comece sua jornada hoje. É de graça.
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-gray-700">
                  Junte-se a milhares de brasileiros aprendendo programação com a metodologia da USP.
                  Sem mensalidade, sem pegadinhas — só conhecimento de qualidade.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/signup">
                    <button className="inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-10 py-5 text-lg font-bold text-white btn-3d">
                      <Play className="h-5 w-5" />
                      Criar conta grátis
                    </button>
                  </Link>
                  <Link href="/login">
                    <button className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#A78BFA] bg-white/60 px-8 py-4 text-lg font-semibold text-[#7C3AED] backdrop-blur transition-all hover:bg-white">
                      Já tenho conta
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
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
                  href="mailto:contato@levelusp.com.br"
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
    </>
  )
}
