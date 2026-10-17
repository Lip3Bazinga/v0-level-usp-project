"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Check, Lock, Play, Star, BookOpen, Clock, Zap, GraduationCap, ChevronRight } from "lucide-react"
import type { Course, Lesson, LessonProgress } from "@levelusp/contracts"
import { computeTrailStatuses, formatNumber, formatXp, toClampedPercent, type TrailStatus } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"
import { groupLessonsByModule, sumEarnedXp } from "./course-groups"

interface ModuleColor {
  background: string
  text: string
  ring: string
  bar: string
}

/** Cores dos módulos na ordem em que aparecem; depois do quinto, recomeça. */
const MODULE_COLORS: readonly ModuleColor[] = [
  { background: "bg-violet-500", text: "text-violet-700", ring: "ring-violet-100", bar: "from-violet-400 to-purple-500" },
  { background: "bg-sky-500", text: "text-sky-700", ring: "ring-sky-100", bar: "from-sky-400 to-blue-500" },
  { background: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-100", bar: "from-emerald-400 to-teal-500" },
  { background: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-100", bar: "from-amber-400 to-orange-500" },
  { background: "bg-rose-500", text: "text-rose-700", ring: "ring-rose-100", bar: "from-rose-400 to-pink-500" },
]

const COMPLETED_STARS = [0, 1, 2]
/** As lições entram em cascata em grupos de 6, para a animação não demorar em trilhas longas. */
const STAGGER_GROUP_SIZE = 6

function progressPercent(completedCount: number, total: number): number {
  return total > 0 ? toClampedPercent(completedCount, total) : 0
}

function trailLabel(status: TrailStatus): string {
  if (status === "completed") return "concluída"
  return status === "locked" ? "bloqueada" : "começar"
}

interface LessonNodeProps {
  lesson: Lesson
  status: TrailStatus
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
      transition={{ type: "spring", stiffness: 240, damping: 22, delay: 0.04 * (index % STAGGER_GROUP_SIZE) }}
      className={`flex items-center gap-4 ${side === "right" ? "flex-row-reverse" : ""}`}
    >
      <div className="relative shrink-0">
        {isActive && (
          <>
            <motion.span
              className="absolute -inset-2 rounded-full bg-level-purple/20"
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-level-purple bg-white px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-level-purple shadow"
            >
              Começar
              <span className="absolute left-1/2 top-full -ml-1.5 h-0 w-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-level-purple" />
            </motion.div>
          </>
        )}
        <Link
          href={isLocked ? "#" : ROUTES.lesson(lesson.id)}
          aria-disabled={isLocked}
          aria-label={`${lesson.title} — ${trailLabel(status)}`}
          tabIndex={isLocked ? -1 : undefined}
          onClick={(event) => isLocked && event.preventDefault()}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full border-b-[5px] transition-transform duration-150 ${
            isDone
              ? "border-emerald-700 bg-emerald-500 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2"
              : isActive
                ? "border-purple-900 bg-level-purple hover:-translate-y-0.5 active:translate-y-0 active:border-b-2"
                : "cursor-not-allowed border-zinc-300 bg-zinc-200"
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

      <div className={`min-w-0 flex-1 ${side === "right" ? "text-right" : ""}`}>
        <p className={`text-sm font-semibold leading-snug ${isLocked ? "text-muted-foreground/50" : "text-foreground"}`}>{lesson.title}</p>
        <div className={`mt-0.5 flex items-center gap-1.5 ${side === "right" ? "justify-end" : ""}`}>
          {isDone ? (
            COMPLETED_STARS.map((star) => <Star key={star} className="h-3 w-3 fill-amber-400 text-amber-400" />)
          ) : (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${isLocked ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
              <Zap className="h-3 w-3" />+{lesson.xp_reward} XP
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

interface ModuleSectionProps {
  name: string
  lessons: Lesson[]
  statuses: TrailStatus[]
  color: ModuleColor
}

function ModuleSection({ name, lessons, statuses, color }: ModuleSectionProps) {
  const completedCount = statuses.filter((status) => status === "completed").length
  const percent = progressPercent(completedCount, lessons.length)

  return (
    <div className="mb-8">
      <div className={`mb-5 flex items-center gap-3 rounded-2xl bg-white p-3 ring-4 ${color.ring}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color.background}`}>
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${color.text}`}>{name}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${color.bar}`}
                initial={{ width: 0 }}
                whileInView={{ width: `${percent}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-muted-foreground">
              {completedCount}/{lessons.length}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 pl-2">
        {lessons.map((lesson, index) => (
          <LessonNode key={lesson.id} lesson={lesson} status={statuses[index]} index={index} side={index % 2 === 0 ? "left" : "right"} />
        ))}
      </div>
    </div>
  )
}

interface CourseCardProps {
  course: Course
  lessons: Lesson[]
  progressMap: Map<string, LessonProgress>
  defaultOpen?: boolean
}

/** Curso no painel: resumo do progresso que abre a trilha de lições por módulo. */
export function CourseCard({ course, lessons, progressMap, defaultOpen = false }: CourseCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const modules = useMemo(() => groupLessonsByModule(lessons), [lessons])
  // O cadeado depende da ordem do curso inteiro, então os status são calculados antes de separar por módulo.
  const statuses = computeTrailStatuses(lessons, progressMap)
  const statusByLessonId = new Map(lessons.map((lesson, index) => [lesson.id, statuses[index]]))
  const completedCount = statuses.filter((status) => status === "completed").length
  const percent = progressPercent(completedCount, lessons.length)
  const earnedXp = sumEarnedXp(lessons, progressMap)

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
      <button
        onClick={() => setIsOpen((current) => !current)}
        className="group flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-level-purple-subtle/40 sm:items-center"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-level-purple to-level-purple-dark shadow-md shadow-purple-200">
          {course.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- capa enviada pelo professor (upload ou URL externa)
            <img src={course.cover_image_url} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <GraduationCap className="h-7 w-7 text-white" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-level-purple-dark">{course.title}</h2>
            {percent === 100 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Completo ✓</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{course.description}</p>

          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-level-purple to-violet-400"
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-level-purple">{percent}%</span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-3">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              {lessons.length} lições · {modules.length} módulos
            </span>
            {course.estimated_hours > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />~{course.estimated_hours}h
              </span>
            )}
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Zap className="h-3 w-3" />
              {formatNumber(earnedXp)}/{formatXp(course.total_xp)}
            </span>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="shrink-0 self-center rounded-full p-1.5 text-muted-foreground transition-colors group-hover:bg-level-purple-light group-hover:text-level-purple"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-5 py-6">
              <Link
                href={ROUTES.course(course.id)}
                className="mb-6 flex items-center justify-between rounded-xl border border-level-purple/30 bg-level-purple-subtle px-4 py-2.5 text-sm font-semibold text-level-purple transition-colors hover:bg-level-purple hover:text-white"
              >
                <span>Ver página do curso</span>
                <ChevronRight className="h-4 w-4" />
              </Link>

              {modules.map((module, moduleIndex) => (
                <ModuleSection
                  key={module.name}
                  name={module.name}
                  lessons={module.lessons}
                  statuses={module.lessons.map((lesson) => statusByLessonId.get(lesson.id) ?? "locked")}
                  color={MODULE_COLORS[moduleIndex % MODULE_COLORS.length]}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
