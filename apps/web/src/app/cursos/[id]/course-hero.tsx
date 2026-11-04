import { Award, BookOpen, CheckCircle2, Clock, Loader2, Play, Star, Zap } from "lucide-react"
import type { Course, Difficulty } from "@levelusp/contracts"
import { DIFFICULTY_BADGE_CLASSES, DIFFICULTY_LABELS } from "@/lib/constants"
import { toClampedPercent, cn } from "@/lib/utils"
import { CourseIcon } from "../course-icon"

const COURSE_GRADIENTS: Record<Difficulty, string> = {
  iniciante: "from-violet-500 to-purple-700",
  intermediario: "from-amber-500 to-orange-600",
  avancado: "from-rose-500 to-red-700",
}

const BASE_PERKS = ["100% gratuito", "Acesso vitalício", "Certificado ao concluir"]
const FINAL_PROJECT_PERK = "Projeto final integrador"

interface CourseHeroProps {
  course: Course
  lessonCount: number
  completedCount: number
  hasFinalProject: boolean
  isEnrolled: boolean
  isEnrolling: boolean
  isAllDone: boolean
  onStart: () => void
  onToggleEnrollment: () => void
  onDownloadCertificate: () => void
}

export function CourseHero({
  course,
  lessonCount,
  completedCount,
  hasFinalProject,
  isEnrolled,
  isEnrolling,
  isAllDone,
  onStart,
  onToggleEnrollment,
  onDownloadCertificate,
}: CourseHeroProps) {
  return (
    <div className={cn("relative bg-linear-to-br", COURSE_GRADIENTS[course.level], "text-white")}>
      {course.cover_image_url && (
        // eslint-disable-next-line @next/next/no-img-element -- capa enviada pelo professor (upload ou URL externa)
        <img
          src={course.cover_image_url}
          alt={course.title}
          className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay"
        />
      )}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
          <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white/15 backdrop-blur md:flex">
            <CourseIcon courseTitle={course.title} className="h-14 w-14 text-white" />
          </div>

          <div className="flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                DIFFICULTY_BADGE_CLASSES[course.level],
                "bg-white/90",
              )}>
                {DIFFICULTY_LABELS[course.level]}
              </span>
              {course.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">{tag}</span>
              ))}
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">{course.title}</h1>
            <p className="mt-2 text-lg text-white/80">{course.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-white/80">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {lessonCount} lições{hasFinalProject ? " + projeto final" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-yellow-300" />
                {course.total_xp} XP no total
              </span>
              {course.estimated_hours > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {course.estimated_hours}h estimadas
                </span>
              )}
              {isEnrolled && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-300" />
                  {completedCount}/{lessonCount} concluídas
                </span>
              )}
            </div>
          </div>

          <div className="w-full shrink-0 rounded-2xl bg-white p-5 text-gray-900 shadow-xl md:w-64">
            <EnrollmentCard
              lessonCount={lessonCount}
              completedCount={completedCount}
              hasFinalProject={hasFinalProject}
              isEnrolled={isEnrolled}
              isEnrolling={isEnrolling}
              isAllDone={isAllDone}
              onStart={onStart}
              onToggleEnrollment={onToggleEnrollment}
              onDownloadCertificate={onDownloadCertificate}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

type EnrollmentCardProps = Omit<CourseHeroProps, "course">

function EnrollmentCard({
  lessonCount,
  completedCount,
  hasFinalProject,
  isEnrolled,
  isEnrolling,
  isAllDone,
  onStart,
  onToggleEnrollment,
  onDownloadCertificate,
}: EnrollmentCardProps) {
  const progressPercent = lessonCount > 0 ? toClampedPercent(completedCount, lessonCount) : 0
  const startLabel = progressPercent === 100 ? "Revisar curso" : progressPercent > 0 ? "Continuar" : "Começar"
  const perks = hasFinalProject ? [...BASE_PERKS, FINAL_PROJECT_PERK] : BASE_PERKS

  return (
    <>
      {isEnrolled && lessonCount > 0 && (
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Progresso</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-level-purple transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {isEnrolled ? (
        <button
          onClick={onStart}
          disabled={lessonCount === 0}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {startLabel}
        </button>
      ) : (
        <EnrollButton isEnrolling={isEnrolling} onEnroll={onToggleEnrollment} className="mb-2 py-3" />
      )}

      {isAllDone && isEnrolled && (
        <button
          onClick={onDownloadCertificate}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-yellow-400 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-yellow-400/30 transition-all hover:scale-[1.02]"
        >
          <Award className="h-4 w-4" />
          Baixar Certificado
        </button>
      )}

      {isEnrolled && (
        <button
          onClick={onToggleEnrollment}
          disabled={isEnrolling}
          className="w-full rounded-xl border border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-300 hover:text-red-500"
        >
          {isEnrolling ? "Aguarde..." : "Cancelar matrícula"}
        </button>
      )}

      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        {perks.map((perk) => (
          <div key={perk} className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {perk}
          </div>
        ))}
      </div>
    </>
  )
}

interface EnrollButtonProps {
  isEnrolling: boolean
  onEnroll: () => void
  /** Espaçamento: o botão aparece no card e, no celular, no fim da página. */
  className: string
}

export function EnrollButton({ isEnrolling, onEnroll, className }: EnrollButtonProps) {
  return (
    <button
      onClick={onEnroll}
      disabled={isEnrolling}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple text-sm font-bold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-50",
        className,
      )}
    >
      {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
      {isEnrolling ? "Matriculando..." : "Matricular-se — Grátis"}
    </button>
  )
}
