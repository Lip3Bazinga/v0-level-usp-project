"use client"

import { ExternalLink, Quote } from "lucide-react"
import { Reveal, Stagger, motion, staggerItem } from "./motion-primitives"
import { SectionIntro } from "./section-heading"
import { SCIENTIFIC_EVIDENCE } from "./content/home"

export function ScienceSection() {
  return (
    <section id="ciencia" className="relative bg-[#FAFAFA] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Base científica"
          title="Nosso método é comprovado por pesquisa"
          description="Cada decisão pedagógica da LevelUSP é fundamentada em décadas de pesquisa em ciência da aprendizagem e psicologia cognitiva. Não é achismo — é evidência."
        />

        <Stagger className="mt-16 grid gap-6 lg:grid-cols-3">
          {SCIENTIFIC_EVIDENCE.map((evidence) => (
            <motion.a
              key={evidence.title}
              href={evidence.href}
              target="_blank"
              rel="noopener noreferrer"
              variants={staggerItem}
              whileHover={{ y: -6 }}
              className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-100"
            >
              <div className="mb-5 flex items-center gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple-light">
                  <evidence.icon className="h-7 w-7 text-level-purple" />
                </div>
                <span className="text-4xl font-bold text-level-purple-dark">{evidence.stat}</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-level-purple-dark">{evidence.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-gray-600">{evidence.description}</p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-level-purple">
                <span>{evidence.source}</span>
                <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.a>
          ))}
        </Stagger>

        <Reveal delay={0.1} className="mx-auto mt-16 max-w-4xl">
          <div className="glass-purple relative rounded-3xl p-10 text-center">
            <Quote className="mx-auto mb-4 h-10 w-10 text-level-purple-medium" />
            <p className="text-pretty text-2xl font-medium leading-relaxed text-level-purple-dark">
              “Aprende-se a programar programando. Por isso colocamos o aluno escrevendo código real
              desde o primeiro minuto, com a teoria sempre a um clique de distância.”
            </p>
            <p className="mt-6 text-sm font-semibold text-level-purple">
              Equipe Pedagógica — LevelUSP / Universidade de São Paulo
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
