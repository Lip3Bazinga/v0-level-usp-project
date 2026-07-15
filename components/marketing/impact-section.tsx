"use client"

import { useEffect, useRef, useState } from "react"
import { useInView } from "framer-motion"
import { Reveal } from "./motion-primitives"
import { Users, BookOpen, MapPin, Award } from "lucide-react"

const STATS = [
  { icon: Users, target: 50000, suffix: "+", label: "Estudantes alcançados" },
  { icon: BookOpen, target: 200, suffix: "+", label: "Lições interativas" },
  { icon: MapPin, target: 27, suffix: "", label: "Estados brasileiros" },
  { icon: Award, target: 98, suffix: "%", label: "Satisfação dos alunos" },
]

function useCountUp(target: number, run: boolean, duration = 1600) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, duration])
  return value
}

function StatItem({ icon: Icon, target, suffix, label, run }: (typeof STATS)[number] & { run: boolean }) {
  const value = useCountUp(target, run)
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div className="text-4xl font-bold text-white sm:text-5xl">
        {value.toLocaleString("pt-BR")}
        {suffix}
      </div>
      <div className="mt-1 text-purple-100/80">{label}</div>
    </div>
  )
}

export function ImpactSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="impacto" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div ref={ref} className="relative overflow-hidden rounded-3xl bg-[#7C3AED] px-8 py-16 sm:px-16">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">
                  Impacto que se mede em vidas transformadas
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-purple-100/90">
                  Desde o lançamento, a LevelUSP vem ampliando o acesso à computação em todo o país.
                </p>
              </div>
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {STATS.map((s) => (
                  <StatItem key={s.label} {...s} run={inView} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
