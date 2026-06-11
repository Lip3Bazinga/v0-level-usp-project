"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

const EASE = [0.22, 1, 0.36, 1] as const

interface PageHeroProps {
  eyebrow: string
  title: ReactNode
  description: string
  icon?: ReactNode
}

/** Consistent institutional page header with aurora + grid backdrop. */
export function PageHero({ eyebrow, title, description, icon }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden pt-36 pb-16 lg:pt-44 lg:pb-20">
      <div className="aurora-bg" aria-hidden />
      <div className="absolute inset-0 grid-backdrop" aria-hidden />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#E9D5FF] bg-white/70 px-4 py-2 text-sm font-medium text-[#7C3AED] backdrop-blur"
        >
          {icon}
          {eyebrow}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="text-balance text-4xl font-bold leading-tight tracking-tight text-[#4C1D95] sm:text-5xl lg:text-6xl"
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-gray-600"
        >
          {description}
        </motion.p>
      </div>
    </section>
  )
}
