"use client"

import { Reveal, Stagger, motion, staggerItem } from "./motion-primitives"
import { Globe2, HeartHandshake, Sprout, Users } from "lucide-react"

const MISSIONS = [
  {
    icon: Globe2,
    title: "Acesso para todo o Brasil",
    desc: "Levamos educação em computação de qualidade a regiões com poucas oportunidades de formação técnica, sem custo algum.",
  },
  {
    icon: HeartHandshake,
    title: "Inclusão e diversidade",
    desc: "Reduzimos a barreira de entrada na tecnologia para estudantes de escolas públicas, mulheres e grupos sub-representados.",
  },
  {
    icon: Sprout,
    title: "Impacto socioeconômico",
    desc: "Formamos talentos que transformam suas comunidades e ampliam a força de trabalho qualificada do país.",
  },
  {
    icon: Users,
    title: "Conhecimento aberto",
    desc: "Todo o conteúdo é desenvolvido por docentes e pesquisadores da USP e disponibilizado gratuitamente.",
  },
]

export function MissionSection() {
  return (
    <section id="missao" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Nossa missão social
          </p>
          <h2 className="text-balance text-4xl font-bold text-[#4C1D95] sm:text-5xl">
            Educação em computação é um direito, não um privilégio
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-gray-600">
            A LevelUSP nasceu dentro da Universidade de São Paulo com um propósito claro: expandir o
            acesso ao conhecimento de programação por todos os cantos do Brasil — começando por quem
            mais precisa.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MISSIONS.map((m) => (
            <motion.div
              key={m.title}
              variants={staggerItem}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-100"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                <m.icon className="h-7 w-7 text-[#7C3AED]" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-[#4C1D95]">{m.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{m.desc}</p>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
