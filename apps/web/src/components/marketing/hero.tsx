"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, GraduationCap, Play, Sparkles } from "lucide-react"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { EASE, entranceMotion } from "./motion-primitives"
import { HERO_FLOATING_STATS } from "./content/home"

const FLOATING_STATS_DELAY_SECONDS = 0.6
const FLOATING_STATS_STAGGER_SECONDS = 0.15
const FLOAT_LOOP_BASE_SECONDS = 4

function FloatingStats(): React.JSX.Element[] {
  return HERO_FLOATING_STATS.map((stat, index) => (
    <motion.div
      key={stat.label}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        ease: EASE,
        delay: FLOATING_STATS_DELAY_SECONDS + index * FLOATING_STATS_STAGGER_SECONDS,
      }}
      className={cn("absolute hidden rounded-2xl glass px-5 py-3 md:block", stat.positionClass)}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: FLOAT_LOOP_BASE_SECONDS + index,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <p className="text-xl font-bold text-level-purple-dark">{stat.value}</p>
        <p className="text-xs text-gray-500">{stat.label}</p>
      </motion.div>
    </motion.div>
  ))
}

export function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden pt-36 pb-24 lg:pt-44 lg:pb-32">
      <div className="aurora-bg" aria-hidden />
      <div className="absolute inset-0 grid-backdrop" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          {...entranceMotion({ offsetY: 20, durationSeconds: 0.6 })}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#E9D5FF] bg-white/70 px-4 py-2 text-sm font-medium text-level-purple backdrop-blur"
        >
          <GraduationCap className="h-4 w-4" />
          Uma iniciativa da Universidade de São Paulo
        </motion.div>

        <motion.h1
          {...entranceMotion({ offsetY: 28, delaySeconds: 0.1 })}
          className="mx-auto max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-level-purple-dark sm:text-6xl lg:text-7xl"
        >
          Democratizando a <span className="gradient-text">computação</span> para todo o Brasil
        </motion.h1>

        <motion.p
          {...entranceMotion({ offsetY: 24, delaySeconds: 0.2 })}
          className="mx-auto mt-8 max-w-2xl text-pretty text-xl leading-relaxed text-gray-600"
        >
          Aprenda a programar com uma metodologia que une{" "}
          <strong className="text-level-purple-dark">teoria</strong> e{" "}
          <strong className="text-level-purple-dark">prática real numa IDE no navegador</strong> —
          gamificada, gratuita e com{" "}
          <strong className="text-level-purple-dark">certificado verificável</strong> ao concluir.
        </motion.p>

        <motion.div
          {...entranceMotion({ offsetY: 24, delaySeconds: 0.3 })}
          className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href={ROUTES.signup}
            className="group inline-flex items-center gap-2 rounded-2xl bg-level-purple px-10 py-5 text-lg font-bold text-white btn-3d"
          >
            <Play className="h-5 w-5" />
            Começar agora
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href={ROUTES.site.methodology}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#E9D5FF] bg-white/60 px-8 py-4 text-lg font-semibold text-level-purple backdrop-blur transition-all hover:border-level-purple hover:bg-level-purple-light"
          >
            <Sparkles className="h-5 w-5" />
            Conhecer o método
          </Link>
        </motion.div>

        <FloatingStats />
      </div>
    </section>
  )
}
