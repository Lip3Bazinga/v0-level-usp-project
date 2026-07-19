"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Rocket, Code2, Database, LineChart, Brain, Trophy } from "lucide-react"

const JOURNEY = [
  {
    icon: Rocket,
    chapter: "Capítulo 1",
    title: "Primeiros passos",
    desc: "Lógica, variáveis e seus primeiros programas em Python rodando na IDE.",
  },
  {
    icon: Code2,
    chapter: "Capítulo 2",
    title: "Estruturas e funções",
    desc: "Condicionais, laços, funções e organização de código limpo.",
  },
  {
    icon: Database,
    chapter: "Capítulo 3",
    title: "Dados e coleções",
    desc: "Listas, dicionários, arquivos e manipulação de dados reais.",
  },
  {
    icon: LineChart,
    chapter: "Capítulo 4",
    title: "Ciência de dados",
    desc: "Pandas, NumPy e visualização para extrair valor de dados.",
  },
  {
    icon: Brain,
    chapter: "Capítulo 5",
    title: "Introdução a ML",
    desc: "Conceitos de machine learning com projetos guiados e práticos.",
  },
  {
    icon: Trophy,
    chapter: "Conquista",
    title: "Projeto final",
    desc: "Construa um projeto completo e receba seu certificado da USP.",
  },
]

export function JourneyScroll() {
  const targetRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: targetRef })

  /* Translate the horizontal track as the user scrolls vertically */
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-72%"])
  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])

  return (
    <section id="cursos" ref={targetRef} className="relative h-[300vh] bg-[#4C1D95]">
      {/* Sticky viewport pinned while the section scrolls */}
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#7C3AED] opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#A78BFA] opacity-30 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#C4B5FD]">
            Sua trilha de aprendizado
          </p>
          <h2 className="max-w-2xl text-balance text-4xl font-bold text-white sm:text-5xl">
            Role para percorrer a jornada
          </h2>

          {/* Progress bar driven by scroll */}
          <div className="mt-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/15">
            <motion.div style={{ width: progress }} className="h-full rounded-full bg-white" />
          </div>
        </div>

        {/* Horizontal track */}
        <motion.div style={{ x }} className="mt-12 flex gap-6 px-4 sm:px-6 lg:px-8">
          {JOURNEY.map((item, i) => (
            <div
              key={item.title}
              className="glass-dark relative w-[78vw] shrink-0 rounded-3xl p-8 sm:w-[420px]"
            >
              <span className="absolute right-6 top-6 text-6xl font-bold text-white/10">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <item.icon className="h-7 w-7 text-[#C4B5FD]" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#C4B5FD]">
                {item.chapter}
              </p>
              <h3 className="mb-3 text-2xl font-bold text-white">{item.title}</h3>
              <p className="leading-relaxed text-purple-100/80">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
