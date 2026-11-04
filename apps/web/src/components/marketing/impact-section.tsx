"use client"

import { useEffect, useRef, useState } from "react"
import { useInView } from "framer-motion"
import { formatNumber } from "@/lib/utils"
import { IMPACT_COUNT_UP_DURATION_MS } from "@/lib/constants"
import { Reveal } from "./motion-primitives"
import { IMPACT_COUNTERS, type CountUpStat } from "./content/home"

/** Dispara a contagem só quando o bloco já está bem dentro da tela. */
const IN_VIEW_MARGIN = "-100px"

/** Desacelera no fim: rápido no começo da contagem, suave ao chegar no alvo. */
function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3)
}

function useCountUp(
  target: number,
  hasStarted: boolean,
  durationMs = IMPACT_COUNT_UP_DURATION_MS,
): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!hasStarted) return
    let frameId = 0
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1)
      setValue(Math.round(target * easeOutCubic(progress)))
      if (progress < 1) frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [target, hasStarted, durationMs])
  return value
}

interface CounterItemProps extends CountUpStat {
  hasStarted: boolean
}

function CounterItem({ icon: Icon, target, suffix, label, hasStarted }: CounterItemProps) {
  const value = useCountUp(target, hasStarted)
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
        <Icon className="h-7 w-7 text-white" />
      </div>
      <div className="text-4xl font-bold text-white sm:text-5xl">
        {formatNumber(value)}
        {suffix}
      </div>
      <div className="mt-1 text-purple-50">{label}</div>
    </div>
  )
}

export function ImpactSection() {
  const panelRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(panelRef, { once: true, margin: IN_VIEW_MARGIN })

  return (
    <section id="impacto" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div
            ref={panelRef}
            className="relative overflow-hidden rounded-3xl bg-level-purple px-8 py-16 sm:px-16"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="mb-12 text-center">
                <h2 className="text-balance text-3xl font-bold text-white sm:text-4xl">
                  Impacto que se mede em vidas transformadas
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-white">
                  Desde o lançamento, a LevelUSP vem ampliando o acesso à computação em todo o país.
                </p>
              </div>
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {IMPACT_COUNTERS.map((counter) => (
                  <CounterItem key={counter.label} {...counter} hasStarted={isInView} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
