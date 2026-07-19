"use client"

import { Reveal, Stagger, motion, staggerItem } from "./motion-primitives"
import { FlaskConical, BrainCircuit, Activity, ExternalLink, Quote } from "lucide-react"

const EVIDENCE = [
  {
    icon: BrainCircuit,
    stat: "+76%",
    title: "Aprendizagem ativa",
    desc: "Estudantes em aulas com prática ativa têm desempenho significativamente superior ao ensino expositivo tradicional.",
    source: "Freeman et al., PNAS (2014)",
    href: "https://www.pnas.org/doi/10.1073/pnas.1319030111",
  },
  {
    icon: Activity,
    stat: "2x",
    title: "Prática deliberada",
    desc: "A prática deliberada com feedback imediato é o maior preditor de domínio em habilidades complexas como programar.",
    source: "Ericsson, Psychological Review",
    href: "https://psycnet.apa.org/record/1993-40718-001",
  },
  {
    icon: FlaskConical,
    stat: "+50%",
    title: "Recuperação espaçada",
    desc: "Testar-se e revisar em intervalos espaçados melhora a retenção de longo prazo comparado a reler conteúdo.",
    source: "Roediger & Karpicke, Science",
    href: "https://www.science.org/doi/10.1126/science.1152408",
  },
]

export function ScienceSection() {
  return (
    <section id="ciencia" className="relative bg-[#FAFAFA] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Base científica
          </p>
          <h2 className="text-balance text-4xl font-bold text-[#4C1D95] sm:text-5xl">
            Nosso método é comprovado por pesquisa
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-gray-600">
            Cada decisão pedagógica da LevelUSP é fundamentada em décadas de pesquisa em ciência da
            aprendizagem e psicologia cognitiva. Não é achismo — é evidência.
          </p>
        </Reveal>

        <Stagger className="mt-16 grid gap-6 lg:grid-cols-3">
          {EVIDENCE.map((e) => (
            <motion.a
              key={e.title}
              href={e.href}
              target="_blank"
              rel="noopener noreferrer"
              variants={staggerItem}
              whileHover={{ y: -6 }}
              className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-100"
            >
              <div className="mb-5 flex items-center gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                  <e.icon className="h-7 w-7 text-[#7C3AED]" />
                </div>
                <span className="text-4xl font-bold text-[#4C1D95]">{e.stat}</span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-[#4C1D95]">{e.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-gray-600">{e.desc}</p>
              <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-[#7C3AED]">
                <span>{e.source}</span>
                <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.a>
          ))}
        </Stagger>

        {/* Pull quote */}
        <Reveal delay={0.1} className="mx-auto mt-16 max-w-4xl">
          <div className="glass-purple relative rounded-3xl p-10 text-center">
            <Quote className="mx-auto mb-4 h-10 w-10 text-[#A78BFA]" />
            <p className="text-pretty text-2xl font-medium leading-relaxed text-[#4C1D95]">
              “Aprende-se a programar programando. Por isso colocamos o aluno escrevendo código real
              desde o primeiro minuto, com a teoria sempre a um clique de distância.”
            </p>
            <p className="mt-6 text-sm font-semibold text-[#7C3AED]">
              Equipe Pedagógica — LevelUSP / Universidade de São Paulo
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
