"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown, Check, Lock, Play, Star, BookOpen, Clock,
  Zap, GraduationCap, ChevronRight,
} from "lucide-react"
import type { Lesson } from "@/lib/supabase/types"
import type { Course } from "@/lib/supabase/types"
import type { LessonStatus } from "@/lib/supabase/lessons"
import { computeModuleStatuses } from "@/lib/supabase/lessons"
import type { LessonProgress } from "@/lib/supabase/types"

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODULE_COLORS: Record<number, { bg: string; text: string; ring: string; bar: string }> = {
  0: { bg: "bg-violet-500",  text: "text-violet-700",  ring: "ring-violet-100", bar: "from-violet-400 to-purple-500" },
  1: { bg: "bg-sky-500",     text: "text-sky-700",     ring: "ring-sky-100",    bar: "from-sky-400 to-blue-500"     },
  2: { bg: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-100",bar: "from-emerald-400 to-teal-500" },
  3: { bg: "bg-amber-500",   text: "text-amber-700",   ring: "ring-amber-100",  bar: "from-amber-400 to-orange-500" },
  4: { bg: "bg-rose-500",    text: "text-rose-700",    ring: "ring-rose-100",   bar: "from-rose-400 to-pink-500"    },
}
const fallbackColor = { bg: "bg-slate-500", text: "text-slate-700", ring: "ring-slate-100", bar: "from-slate-400 to-slate-500" }

function getModuleColor(idx: number) {
  return MODULE_COLORS[idx % Object.keys(MODULE_COLORS).length] ?? fallbackColor
}

// ── Nó de lição ──────────────────────────────────────────────────────────────

interface LessonNodeProps {
  lesson: Lesson
  status: LessonStatus
  index: number
  side: "left" | "right"
}

function LessonNode({ lesson, status, index, side }: LessonNodeProps) {
  const isDone = status === "completed"
  const isActive = status === "in-progress"
  const isLocked = status === "locked"

  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? -56 : 56 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.04 * (index % 6) }}
      className={`flex items-center gap-4 ${side === "right" ? "flex-row-reverse" : ""}`}
    >
      {/* Nó */}
      <div className="relative shrink-0">
        {isActive && (
          <motion.span
            className="absolute -inset-2 rounded-full bg-level-purple/20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          />
        )}
        {isActive && (
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-xl border-2 border-level-purple bg-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-level-purple shadow"
          >
            Começar
            <span className="absolute left-1/2 top-full -ml-1.5 h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-level-purple" />
          </motion.div>
        )}
        <Link
          href={isLocked ? "#" : `/lesson/${lesson.id}`}
          aria-disabled={isLocked}
          onClick={(e) => isLocked && e.preventDefault()}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full border-b-[5px] transition-transform duration-150 ${
            isDone
              ? "bg-emerald-500 border-emerald-700 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2"
              : isActive
              ? "bg-level-purple border-purple-900 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2"
              : "bg-zinc-200 border-zinc-300 cursor-not-allowed"
          }`}
        >
          {isDone ? (
            <Check className="h-6 w-6 text-white" strokeWidth={3} />
          ) : isActive ? (
            <Play className="ml-1 h-5 w-5 fill-white text-white" />
          ) : (
            <Lock className="h-5 w-5 text-zinc-400" />
          )}
        </Link>
      </div>

      {/* Info */}
      <div className={`min-w-0 flex-1 ${side === "right" ? "text-right" : ""}`}>
        <p className={`text-sm font-semibold leading-snug ${isLocked ? "text-muted-foreground/50" : "text-foreground"}`}>
          {lesson.title}
        </p>
        <div className={`mt-0.5 flex items-center gap-1.5 ${side === "right" ? "justify-end" : ""}`}>
          {isDone ? (
            <>
              {[0,1,2].map((s) => <Star key={s} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
            </>
          ) : (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${isLocked ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
              <Zap className="h-3 w-3" />
              +{lesson.xp_reward} XP
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Seção de módulo ───────────────────────────────────────────────────────────

interface ModuleSectionProps {
  name: string
  lessons: Lesson[]
  statuses: LessonStatus[]
  colorIdx: number
}

function ModuleSection({ name, lessons, statuses, colorIdx }: ModuleSectionProps) {
  const color = getModuleColor(colorIdx)
  const completed = statuses.filter((s) => s === "completed").length
  const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0

  return (
    <div className="mb-8">
      {/* Cabeçalho do módulo */}
      <div className={`mb-5 flex items-center gap-3 rounded-2xl p-3 ring-4 ${color.ring} bg-white`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color.bg}`}>
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${color.text}`}>{name}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${color.bar}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-bold text-muted-foreground tabular-nums">
              {completed}/{lessons.length}
            </span>
          </div>
        </div>
      </div>

      {/* Lições com alternância left/right */}
      <div className="flex flex-col gap-5 pl-2">
        {lessons.map((lesson, i) => (
          <LessonNode
            key={lesson.id}
            lesson={lesson}
            status={statuses[i]}
            index={i}
            side={i % 2 === 0 ? "left" : "right"}
          />
        ))}
      </div>
    </div>
  )
}

// ── CourseCard (colapsável) ───────────────────────────────────────────────────

interface CourseCardProps {
  course: Course
  lessons: Lesson[]
  progressMap: Map<string, LessonProgress>
  defaultOpen?: boolean
}

export function CourseCard({ course, lessons, progressMap, defaultOpen = false }: CourseCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  // Agrupar lições por módulo mantendo ordem
  const modules = (() => {
    const map = new Map<string, Lesson[]>()
    for (const l of lessons) {
      const key = l.module || "Módulo 1"
      const moduleLessons = map.get(key) ?? []
      moduleLessons.push(l)
      map.set(key, moduleLessons)
    }
    return Array.from(map.entries()).map(([name, mLessons]) => ({
      name,
      lessons: mLessons.sort((a, b) => a.order - b.order),
    }))
  })()

  const allStatuses = computeModuleStatuses(lessons, progressMap)
  const completed = allStatuses.filter((s) => s === "completed").length
  const pct = lessons.length ? Math.round((completed / lessons.length) * 100) : 0

  // XP total do progresso do aluno nesse curso
  const earnedXp = lessons.reduce((acc, l) => {
    const p = progressMap.get(l.id)
    return acc + (p?.xp_earned ?? 0)
  }, 0)

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
      {/* Header clicável */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-level-purple-subtle/40 sm:items-center"
      >
        {/* Ícone/capa */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-level-purple to-level-purple-dark shadow-md shadow-purple-200">
          {course.cover_image_url ? (
            <img src={course.cover_image_url} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <GraduationCap className="h-7 w-7 text-white" />
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-level-purple-dark">{course.title}</h2>
            {pct === 100 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Completo ✓
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{course.description}</p>

          {/* Barra de progresso + stats */}
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-level-purple to-violet-400"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-bold text-level-purple tabular-nums">{pct}%</span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-3">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {lessons.length} lições · {modules.length} módulos
            </span>
            {course.estimated_hours && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                ~{course.estimated_hours}h
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Zap className="h-3 w-3" />
              {earnedXp.toLocaleString("pt-BR")}/{(course.total_xp ?? 0).toLocaleString("pt-BR")} XP
            </span>
          </div>
        </div>

        {/* Chevron */}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="shrink-0 self-center rounded-full p-1.5 text-muted-foreground transition-colors group-hover:bg-level-purple-light group-hover:text-level-purple"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      {/* Conteúdo colapsável */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-6">
              {/* Link rápido */}
              <Link
                href={`/cursos/${course.id}`}
                className="mb-6 flex items-center justify-between rounded-xl border border-level-purple/30 bg-level-purple-subtle px-4 py-2.5 text-sm font-semibold text-level-purple transition-colors hover:bg-level-purple hover:text-white"
              >
                <span>Ver página do curso</span>
                <ChevronRight className="h-4 w-4" />
              </Link>

              {/* Módulos */}
              {modules.map((mod, modIdx) => {
                // Calcular offset de índice para statuses globais
                const offsetStart = lessons.findIndex((l) => l.id === mod.lessons[0]?.id)
                const modStatuses = allStatuses.slice(offsetStart, offsetStart + mod.lessons.length)
                return (
                  <ModuleSection
                    key={mod.name}
                    name={mod.name}
                    lessons={mod.lessons}
                    statuses={modStatuses}
                    colorIdx={modIdx}
                  />
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
