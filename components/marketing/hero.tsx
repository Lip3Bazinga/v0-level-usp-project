"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Play, ArrowRight, Sparkles, GraduationCap } from "lucide-react"

const EASE = [0.22, 1, 0.36, 1] as const

const FLOAT_STATS = [
  { value: "100%", label: "Gratuito", className: "left-2 top-28 sm:left-8 lg:left-16" },
  { value: "+50 XP", label: "por lição", className: "right-2 top-40 sm:right-8 lg:right-20" },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 pb-24 lg:pt-44 lg:pb-32">
      {/* Animated aurora + grid backdrop */}
      <div className="aurora-bg" aria-hidden />
      <div className="absolute inset-0 grid-backdrop" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#E9D5FF] bg-white/70 px-4 py-2 text-sm font-medium text-[#7C3AED] backdrop-blur"
        >
          <GraduationCap className="h-4 w-4" />
          Uma iniciativa da Universidade de São Paulo
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="mx-auto max-w-4xl text-balance text-5xl font-bold leading-tight tracking-tight text-[#4C1D95] sm:text-6xl lg:text-7xl"
        >
          Democratizando a <span className="gradient-text">computação</span> para todo o Brasil
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          className="mx-auto mt-8 max-w-2xl text-pretty text-xl leading-relaxed text-gray-600"
        >
          Aprenda a programar com uma metodologia que une <strong className="text-[#4C1D95]">teoria</strong> e{" "}
          <strong className="text-[#4C1D95]">prática real numa IDE no navegador</strong> — gamificada,
          gratuita e baseada em ciência da aprendizagem.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link href="/signup">
            <button className="group inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-10 py-5 text-lg font-bold text-white btn-3d">
              <Play className="h-5 w-5" />
              Começar agora
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <Link href="/metodologia">
            <button className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#E9D5FF] bg-white/60 px-8 py-4 text-lg font-semibold text-[#7C3AED] backdrop-blur transition-all hover:border-[#7C3AED] hover:bg-[#F3E8FF]">
              <Sparkles className="h-5 w-5" />
              Conhecer o método
            </button>
          </Link>
        </motion.div>

        {/* Floating glass stat chips */}
        {FLOAT_STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.6 + i * 0.15 }}
            className={`absolute hidden rounded-2xl glass px-5 py-3 md:block ${stat.className}`}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
            >
              <p className="text-xl font-bold text-[#4C1D95]">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
