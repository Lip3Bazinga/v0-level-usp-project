"use client"

import { ArrowDown } from "lucide-react"
import { Reveal, motion } from "./motion-primitives"
import { SectionIntro } from "./section-heading"
import { formatStepNumber } from "./step-number"
import { METHOD_STEPS } from "./content/home"

const STEP_REVEAL_STAGGER_SECONDS = 0.12

/** Seta animada entre uma etapa e a próxima, só no desktop. */
function StepConnector() {
  return (
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -bottom-3 left-1/2 z-10 hidden -translate-x-1/2 lg:block"
    >
      <div className="flex h-8 w-8 rotate-[-90deg] items-center justify-center rounded-full bg-white shadow-md">
        <ArrowDown className="h-4 w-4 text-level-purple" />
      </div>
    </motion.div>
  )
}

export function MethodSection() {
  return (
    <section id="metodo" className="relative overflow-hidden py-24 lg:py-32">
      <div className="aurora-bg opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Nossa metodologia"
          title="Teoria que vira prática em segundos"
          description="Combinamos aprendizagem ativa com prática deliberada: cada conceito teórico é seguido imediatamente por um exercício na IDE. É o ciclo que a ciência cognitiva mostra ser o mais eficaz para reter conhecimento técnico."
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {METHOD_STEPS.map((step, index) => (
            <Reveal
              key={step.title}
              delay={index * STEP_REVEAL_STAGGER_SECONDS}
              className="relative"
            >
              <div className="glass-purple flex h-full flex-col rounded-3xl p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple shadow-lg shadow-purple-300/40">
                    <step.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-5xl font-bold text-[#E9D5FF]">
                    {formatStepNumber(index)}
                  </span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-level-purple-dark">{step.title}</h3>
                <p className="leading-relaxed text-gray-600">{step.description}</p>
              </div>

              {index < METHOD_STEPS.length - 1 && <StepConnector />}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
