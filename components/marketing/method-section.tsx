"use client"

import { Reveal, motion } from "./motion-primitives"
import { BookOpen, Terminal, Repeat, ArrowDown } from "lucide-react"

const STEPS = [
  {
    icon: BookOpen,
    step: "01",
    title: "Teoria contextualizada",
    desc: "Conceitos apresentados em pequenos blocos, com exemplos do mundo real e linguagem acessível — sem pré-requisitos.",
  },
  {
    icon: Terminal,
    step: "02",
    title: "Prática imediata na IDE",
    desc: "Você escreve e executa código real numa IDE no navegador, sem instalar nada. O aprendizado acontece fazendo.",
  },
  {
    icon: Repeat,
    step: "03",
    title: "Feedback e repetição",
    desc: "Testes automáticos avaliam seu código na hora, reforçam o conceito e ajustam a dificuldade ao seu ritmo.",
  },
]

export function MethodSection() {
  return (
    <section id="metodo" className="relative overflow-hidden py-24 lg:py-32">
      <div className="aurora-bg opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Nossa metodologia
          </p>
          <h2 className="text-balance text-4xl font-bold text-[#4C1D95] sm:text-5xl">
            Teoria que vira prática em segundos
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-gray-600">
            Combinamos aprendizagem ativa com prática deliberada: cada conceito teórico é seguido
            imediatamente por um exercício na IDE. É o ciclo que a ciência cognitiva mostra ser o
            mais eficaz para reter conhecimento técnico.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.12} className="relative">
              <div className="glass-purple flex h-full flex-col rounded-3xl p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED] shadow-lg shadow-purple-300/40">
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-5xl font-bold text-[#E9D5FF]">{s.step}</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-[#4C1D95]">{s.title}</h3>
                <p className="leading-relaxed text-gray-600">{s.desc}</p>
              </div>

              {/* Connector arrow between steps on desktop */}
              {i < STEPS.length - 1 && (
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-3 left-1/2 z-10 hidden -translate-x-1/2 lg:block"
                >
                  <div className="flex h-8 w-8 rotate-[-90deg] items-center justify-center rounded-full bg-white shadow-md">
                    <ArrowDown className="h-4 w-4 text-[#7C3AED]" />
                  </div>
                </motion.div>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
