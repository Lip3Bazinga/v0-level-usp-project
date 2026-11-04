"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { formatStepNumber } from "./step-number"
import { JOURNEY_CHAPTERS } from "./content/home"

/** Deslocamento da faixa de capítulos do início ao fim da rolagem da seção. */
const TRACK_OFFSET_RANGE = ["2%", "-72%"]

export function JourneyScroll(): React.JSX.Element {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: sectionRef })

  // A rolagem vertical da seção move a faixa de capítulos na horizontal.
  const trackOffsetX = useTransform(scrollYProgress, [0, 1], TRACK_OFFSET_RANGE)
  const progressWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])

  return (
    <section id="cursos" ref={sectionRef} className="relative h-[300vh] bg-level-purple-dark">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-level-purple opacity-40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-level-purple-medium opacity-30 blur-3xl" />

        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#C4B5FD]">
            Sua trilha de aprendizado
          </p>
          <h2 className="max-w-2xl text-balance text-4xl font-bold text-white sm:text-5xl">
            Role para percorrer a jornada
          </h2>

          <div className="mt-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/15">
            <motion.div style={{ width: progressWidth }} className="h-full rounded-full bg-white" />
          </div>
        </div>

        <motion.div style={{ x: trackOffsetX }} className="mt-12 flex gap-6 px-4 sm:px-6 lg:px-8">
          {JOURNEY_CHAPTERS.map((chapter, index) => (
            <div
              key={chapter.title}
              className="glass-dark relative w-[78vw] shrink-0 rounded-3xl p-8 sm:w-[420px]"
            >
              <span
                aria-hidden="true"
                className="absolute right-6 top-6 text-6xl font-bold text-white/10"
              >
                {formatStepNumber(index)}
              </span>
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <chapter.icon className="h-7 w-7 text-[#C4B5FD]" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#C4B5FD]">
                {chapter.chapter}
              </p>
              <h3 className="mb-3 text-2xl font-bold text-white">{chapter.title}</h3>
              <p className="leading-relaxed text-purple-100/80">{chapter.description}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
