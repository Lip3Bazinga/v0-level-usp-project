"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, CheckCircle2, ChevronRight, Clock, FlaskConical, Lock, Play, Star, Trophy, Zap, type LucideIcon } from "lucide-react"
import type { Course, ExamStatus, Lesson } from "@levelusp/contracts"
import { DIFFICULTY_BADGE_CLASSES, DIFFICULTY_LABELS, ROUTES } from "@/lib/constants"
import { formatPercent, type TrailStatus, cn } from "@/lib/utils"

const COMPLETED_STARS = [0, 1, 2]
/** Quantas lições o quadro "O que você vai aprender" lista antes de resumir o resto. */
const LEARNING_PREVIEW_SIZE = 6

interface CourseLessonListProps {
  lessons: readonly Lesson[]
  statuses: readonly TrailStatus[]
  isEnrolled: boolean
}

export function CourseLessonList({ lessons, statuses, isEnrolled }: CourseLessonListProps) {
  if (lessons.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhuma lição publicada ainda.
      </div>
    )
  }
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
      {lessons.map((lesson, index) => (
        <CourseLessonRow
          key={lesson.id}
          lesson={lesson}
          position={index + 1}
          status={statuses[index]}
          isEnrolled={isEnrolled}
        />
      ))}
    </div>
  )
}

const STATUS_BADGE_CLASSES: Record<TrailStatus, string> = {
  completed: "bg-green-100",
  "in-progress": "bg-level-purple-light",
  locked: "bg-muted",
}

function LessonStatusIcon({ status }: { status: TrailStatus }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-600" />
  if (status === "in-progress") return <Play className="h-4 w-4 text-level-purple" />
  return <Lock className="h-3.5 w-3.5 text-muted-foreground" />
}

interface CourseLessonRowProps {
  lesson: Lesson
  position: number
  status: TrailStatus
  isEnrolled: boolean
}

function CourseLessonRow({ lesson, position, status, isEnrolled }: CourseLessonRowProps) {
  const router = useRouter()
  const canAccess = isEnrolled && status !== "locked"
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 transition-colors",
        canAccess ? "cursor-pointer hover:bg-level-purple-subtle" : "opacity-60",
      )}
      onClick={() => canAccess && router.push(ROUTES.lesson(lesson.id))}
    >
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
        STATUS_BADGE_CLASSES[status],
      )}>
        <LessonStatusIcon status={status} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "truncate text-sm font-medium",
          status === "locked" ? "text-muted-foreground" : "text-level-purple-dark",
        )}>
          {position}. {lesson.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {DIFFICULTY_LABELS[lesson.difficulty]} · +{lesson.xp_reward} XP
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status === "completed" && (
          <div className="flex items-center gap-0.5">
            {COMPLETED_STARS.map((star) => (
              <Star key={star} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        )}
        {canAccess && status !== "completed" && <ChevronRight className="h-4 w-4 text-level-purple" />}
        {!isEnrolled && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
    </div>
  )
}

function describeExamStatus(examStatus: ExamStatus): string {
  const { exam } = examStatus
  if (examStatus.passed) {
    return `Aprovado com ${formatPercent(examStatus.passedScore ?? 0)} — conclua o projeto final para emitir o certificado`
  }
  if (examStatus.eligible) {
    return `${exam.questionCount} questões · nota mínima ${exam.passingScore}% · ${exam.timeLimitMinutes} min`
  }
  return `Conclua as ${examStatus.lessonsRemaining} lições restantes para desbloquear a prova`
}

interface CertificationSectionProps {
  courseId: string
  examStatus: ExamStatus
  certificateCode: string | null
}

export function CertificationSection({ courseId, examStatus, certificateCode }: CertificationSectionProps) {
  const { passed, eligible } = examStatus
  const cardClassName = passed
    ? "border-green-300 bg-green-50"
    : eligible
      ? "border-level-purple bg-level-purple-subtle"
      : "border-border bg-muted/30"
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-level-purple-dark">Prova Final e Certificação</h2>
      <div className={cn("rounded-2xl border-2 p-5", cardClassName)}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            passed ? "bg-green-100" : "bg-white",
          )}>
            {passed ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : eligible ? (
              <Trophy className="h-6 w-6 text-level-purple" />
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-level-purple-dark">{examStatus.exam.title}</p>
            <p className="text-xs text-muted-foreground">{describeExamStatus(examStatus)}</p>
          </div>
          {(eligible || passed) && (
            <Link
              href={ROUTES.courseExam(courseId)}
              className="shrink-0 rounded-xl bg-level-purple px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-level-purple-dark"
            >
              {passed ? "Ver resultado" : "Fazer a prova"}
            </Link>
          )}
        </div>
        {certificateCode && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-green-200">
            <p className="text-xs text-muted-foreground">
              🎓 Certificado emitido — código <span className="font-mono font-semibold">{certificateCode}</span>
            </p>
            <Link href={ROUTES.certificate(certificateCode)} className="shrink-0 text-xs font-bold text-level-purple hover:underline">
              Ver / baixar PDF →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

interface FinalProjectSectionProps {
  course: Course
  lessonCount: number
  /** Matriculado com todas as lições concluídas: o projeto fica liberado. */
  isUnlocked: boolean
  onStart: () => void
}

export function FinalProjectSection({ course, lessonCount, isUnlocked, onStart }: FinalProjectSectionProps) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-level-purple-dark">Projeto Final</h2>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border-2 transition-all",
          isUnlocked ? "border-yellow-400 shadow-lg shadow-yellow-100" : "border-border opacity-75",
        )}
      >
        <div className={cn(
          "flex items-center gap-3 px-5 py-4",
          isUnlocked ? "bg-linear-to-r from-yellow-400 to-amber-500 text-white" : "bg-muted/50",
        )}>
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isUnlocked ? "bg-white/20" : "bg-muted",
          )}>
            {isUnlocked ? <Star className="h-5 w-5 text-white" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-bold", isUnlocked ? "text-white" : "text-level-purple-dark")}>{course.final_project_title}</p>
            <p className={cn("text-xs", isUnlocked ? "text-white/80" : "text-muted-foreground")}>
              {isUnlocked ? "Você desbloqueou o projeto final!" : `Complete todas as ${lessonCount} lições para desbloquear`}
            </p>
          </div>
          {isUnlocked && (
            <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">Desbloqueado</span>
          )}
        </div>

        <div className="bg-white px-5 py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{course.final_project_description}</p>

          {isUnlocked && course.final_project_starter_code && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-level-purple" />
                <span className="text-xs font-semibold text-level-purple-dark">Código inicial</span>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-[#1e1e1e] p-4 text-xs leading-relaxed text-gray-300">
                <code>{course.final_project_starter_code}</code>
              </pre>
            </div>
          )}

          {isUnlocked && (
            <button
              onClick={onStart}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-colors hover:bg-level-purple-dark"
            >
              <Play className="h-4 w-4" />
              Iniciar Projeto Final
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

interface CourseSidebarProps {
  course: Course
  lessons: readonly Lesson[]
  hasFinalProject: boolean
}

interface CourseStat {
  icon: LucideIcon
  label: string
  value: string
  colorClassName: string
  /** Classes de selo: o valor aparece como etiqueta colorida. */
  badgeClassName?: string
}

function courseStats(course: Course, lessonCount: number, hasFinalProject: boolean): CourseStat[] {
  const stats: CourseStat[] = [
    { icon: BookOpen, label: "Lições", value: String(lessonCount), colorClassName: "" },
    { icon: Zap, label: "XP Total", value: String(course.total_xp), colorClassName: "text-yellow-500" },
    { icon: Clock, label: "Duração est.", value: course.estimated_hours > 0 ? `${course.estimated_hours}h` : "—", colorClassName: "" },
    {
      icon: Trophy,
      label: "Nível",
      value: DIFFICULTY_LABELS[course.level],
      colorClassName: "",
      badgeClassName: DIFFICULTY_BADGE_CLASSES[course.level],
    },
  ]
  if (hasFinalProject) stats.push({ icon: Star, label: "Projeto Final", value: "Incluído", colorClassName: "text-yellow-500" })
  return stats
}

export function CourseSidebar({ course, lessons, hasFinalProject }: CourseSidebarProps) {
  const hiddenLessonCount = lessons.length - LEARNING_PREVIEW_SIZE
  return (
    <>
      <div className="rounded-2xl border border-border bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-level-purple-dark">O que você vai aprender</h3>
        <ul className="space-y-2">
          {lessons.slice(0, LEARNING_PREVIEW_SIZE).map((lesson) => (
            <li key={lesson.id} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-level-purple" />
              {lesson.title}
            </li>
          ))}
          {hasFinalProject && (
            <li className="flex items-start gap-2 text-xs font-medium text-amber-600">
              <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-500" />
              {course.final_project_title}
            </li>
          )}
          {hiddenLessonCount > 0 && <li className="text-xs font-medium text-level-purple">+ {hiddenLessonCount} mais...</li>}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-level-purple-dark">Estatísticas</h3>
        <div className="space-y-3">
          {courseStats(course, lessons.length, hasFinalProject).map((stat) => (
            <div key={stat.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <stat.icon className={cn("h-4 w-4", stat.colorClassName)} /> {stat.label}
              </span>
              {stat.badgeClassName ? (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", stat.badgeClassName)}>{stat.value}</span>
              ) : (
                <span className={cn("font-semibold text-level-purple-dark", stat.colorClassName)}>{stat.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
