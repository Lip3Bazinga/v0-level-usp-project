"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Check, Lock, Play, Star, type LucideIcon } from "lucide-react"
import type { Lesson } from "@/lib/supabase/types"
import type { LessonStatus } from "@/lib/supabase/lessons"

// Serpentina: deslocamento horizontal cíclico dos nós (estilo Duolingo)
const WAVE = [0, 52, 84, 52, 0, -52, -84, -52]

interface ModuleTrailProps {
  name: string
  icon: LucideIcon
  accentClass: string // ex: "bg-level-purple"
  lessons: Lesson[]
  statuses: LessonStatus[]
}

export function ModuleTrail({ name, icon: Icon, accentClass, lessons, statuses }: ModuleTrailProps) {
  const completedCount = statuses.filter((s) => s === "completed").length
  const pct = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0

  return (
    <section>
      {/* Cabeçalho do módulo */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4 }}
        className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-level-purple to-level-purple-dark p-5 text-white shadow-lg shadow-purple-200"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-extrabold">{name}</h2>
            <p className="text-xs text-purple-200">
              {completedCount} de {lessons.length} lições · {pct}%
            </p>
          </div>
          <span className="hidden rounded-full bg-white/15 px-3 py-1 text-xs font-bold sm:block">
            {pct === 100 ? "Completo" : `${pct}%`}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400"
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </motion.div>

      {/* Trilha */}
      <div className="flex flex-col items-center">
        {lessons.map((lesson, index) => {
          const status = statuses[index]
          const offset = WAVE[index % WAVE.length]
          const isActive = status === "in-progress"
          const isDone = status === "completed"

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.03 * (index % 8) }}
              className="relative flex flex-col items-center pb-9"
              style={{ transform: `translateX(${offset}px)` }}
            >
              {/* Balão COMEÇAR no nó ativo */}
              {isActive && (
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                  className="pointer-events-none absolute -top-9 z-10 rounded-xl border-2 border-level-purple bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-level-purple shadow-md"
                >
                  Começar
                  <span className="absolute left-1/2 top-full -ml-1.5 h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-level-purple" />
                </motion.div>
              )}

              <Link
                href={status === "locked" ? "#" : `/lesson/${lesson.id}`}
                aria-disabled={status === "locked"}
                title={`${lesson.title} · +${lesson.xp_reward} XP`}
                onClick={(e) => status === "locked" && e.preventDefault()}
                className={`group relative block ${status === "locked" ? "cursor-not-allowed" : ""}`}
              >
                {/* Halo pulsante no ativo */}
                {isActive && (
                  <motion.span
                    className="absolute -inset-2 rounded-full bg-level-purple/25"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.15, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  />
                )}

                {/* Nó (botão 3D) */}
                <span
                  className={`relative flex h-[68px] w-[68px] items-center justify-center rounded-full border-b-[6px] transition-transform duration-150 ${
                    isDone
                      ? "bg-emerald-500 border-emerald-700 group-hover:-translate-y-0.5 group-active:translate-y-0.5 group-active:border-b-2"
                      : isActive
                      ? "bg-level-purple border-purple-900 group-hover:-translate-y-0.5 group-active:translate-y-0.5 group-active:border-b-2"
                      : "bg-zinc-200 border-zinc-300"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-8 w-8 text-white" strokeWidth={3.5} />
                  ) : isActive ? (
                    <Play className="ml-1 h-7 w-7 fill-white text-white" />
                  ) : (
                    <Lock className="h-6 w-6 text-zinc-400" />
                  )}
                </span>
              </Link>

              {/* Título + estrelas/XP */}
              <div className="mt-2 w-36 text-center">
                <p
                  className={`truncate text-xs font-bold ${
                    status === "locked" ? "text-muted-foreground/60" : "text-foreground"
                  }`}
                >
                  {lesson.title}
                </p>
                {isDone ? (
                  <div className="mt-0.5 flex items-center justify-center gap-0.5">
                    {[0, 1, 2].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                ) : (
                  <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    +{lesson.xp_reward} XP
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
