"use client"

import { useState } from "react"
import Link from "next/link"
import { Award, CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react"
import type { TrackCourse, TrackCourseStatus, TrackWithCourses } from "@levelusp/contracts"
import { LoadErrorAlert } from "@/components/design-system/load-error-alert"
import { levelButtonClasses } from "@/components/design-system/level-button"
import { Spinner } from "@/components/design-system/spinner"
import { useAuth } from "@/contexts/auth-context"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchTrack, getErrorMessage, issueTrackCertificate } from "@/lib/api"
import { DIFFICULTY_LABELS, ROUTES } from "@/lib/constants"
import { swalToast } from "@/lib/swal"
import { cn } from "@/lib/utils"
import { prerequisiteTitle, summarizeTrack, TRACK_COURSE_STATUS_LABELS } from "@/lib/utils/tracks"

const STATUS_CLASSES: Readonly<Record<TrackCourseStatus, string>> = {
  locked: "bg-gray-100 text-gray-500",
  available: "bg-level-purple-light text-level-purple",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-blue-100 text-blue-800",
  certified: "bg-green-100 text-green-800",
}

const ACTION_LABELS: Readonly<Record<Exclude<TrackCourseStatus, "locked">, string>> = {
  available: "Começar",
  in_progress: "Continuar",
  completed: "Fazer a prova",
  certified: "Rever o curso",
}

interface TrackCourseItemProps {
  course: TrackCourse
  /** Título do pré-requisito que trava o curso; null quando não se aplica. */
  lockedBy: string | null
}

function TrackCourseItem({ course, lockedBy }: TrackCourseItemProps): React.JSX.Element {
  const status = course.student_status
  const Icon = status === "locked" ? Lock : status === "certified" ? CheckCircle2 : PlayCircle
  return (
    <li className={cn("flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center", status === "locked" && "opacity-70")}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-level-purple-light text-lg font-bold text-level-purple" aria-hidden="true">
        {course.position}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-level-purple-dark">{course.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{course.description}</p>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span>{DIFFICULTY_LABELS[course.level]}</span>
          {course.estimated_hours > 0 && (
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> cerca de {course.estimated_hours} h</span>
          )}
          {course.lesson_count !== undefined && <span>{course.lesson_count} lições</span>}
          <span className={cn("rounded-full px-2 py-0.5 font-semibold", STATUS_CLASSES[status])}>{TRACK_COURSE_STATUS_LABELS[status]}</span>
        </p>
        {status === "locked" && (
          <p className="mt-2 text-xs text-gray-500">
            Libera com o certificado de {lockedBy ?? "um curso anterior"}.
          </p>
        )}
      </div>
      {status === "locked" ? (
        <Icon className="h-5 w-5 shrink-0 text-gray-400" aria-label="Curso bloqueado" />
      ) : (
        <Link href={ROUTES.course(course.id)} className={cn(levelButtonClasses(status === "certified" ? "secondary" : "primary", "sm"), "shrink-0")}>
          <Icon className="h-4 w-4" aria-hidden="true" /> {ACTION_LABELS[status]}
        </Link>
      )}
    </li>
  )
}

interface TrackCertificatePanelProps {
  track: TrackWithCourses
  isSignedIn: boolean
}

/** Andamento na trilha e a emissão do certificado (a API confere se todos os cursos estão certificados). */
function TrackCertificatePanel({ track, isSignedIn }: TrackCertificatePanelProps): React.JSX.Element {
  const [code, setCode] = useState<string | null>(null)
  const [isIssuing, setIsIssuing] = useState(false)
  const summary = summarizeTrack(track.courses)

  const handleIssue = async (): Promise<void> => {
    setIsIssuing(true)
    try {
      setCode((await issueTrackCertificate(track.id)).verification_code)
    } catch (error) {
      swalToast({ title: getErrorMessage(error, "Não foi possível emitir o certificado."), icon: "error" })
    } finally {
      setIsIssuing(false)
    }
  }

  return (
    <aside className="rounded-2xl border border-level-purple/20 bg-level-purple-light p-6">
      <h2 className="flex items-center gap-2 font-semibold text-level-purple-dark">
        <Award className="h-5 w-5" aria-hidden="true" /> Certificado da trilha
      </h2>
      <p className="mt-2 text-sm text-gray-700">
        {track.certificate_title || track.title}: emitido quando todos os cursos da trilha tiverem certificado.
      </p>
      {isSignedIn && (
        <>
          <progress className="mt-4 h-2 w-full" max={summary.total} value={summary.certified} aria-label="Cursos certificados na trilha" />
          <p className="mt-1 text-xs text-gray-600">{summary.certified} de {summary.total} cursos certificados</p>
        </>
      )}
      {code ? (
        <Link href={ROUTES.certificate(code)} className={cn(levelButtonClasses("primary", "sm"), "mt-4")}>Ver certificado {code}</Link>
      ) : summary.isCertifiable ? (
        <button type="button" onClick={() => void handleIssue()} disabled={isIssuing} className={cn(levelButtonClasses("primary", "sm"), "mt-4")}>
          {isIssuing ? "Emitindo..." : "Emitir certificado da trilha"}
        </button>
      ) : !isSignedIn ? (
        <Link href={ROUTES.loginWithNext(ROUTES.track(track.slug))} className={cn(levelButtonClasses("primary", "sm"), "mt-4")}>Entrar para acompanhar</Link>
      ) : null}
    </aside>
  )
}

/** Página de uma trilha: os cursos na ordem, com a situação do aluno em cada um, e o certificado da trilha. */
export function TrackDetail({ slug }: { slug: string }): React.JSX.Element {
  const { profile } = useAuth()
  // A situação por curso depende de quem está logado: a `key` refaz a busca quando a sessão chega.
  return <TrackDetailContent key={profile?.id ?? "visitante"} slug={slug} isSignedIn={Boolean(profile)} />
}

function TrackDetailContent({ slug, isSignedIn }: { slug: string; isSignedIn: boolean }): React.JSX.Element {
  const track = useAsyncResource(() => fetchTrack(slug), [slug], { errorMessage: "Não foi possível carregar a trilha." })

  if (track.status === "loading") {
    return <div className="flex justify-center py-24" role="status" aria-label="Carregando trilha"><Spinner /></div>
  }
  if (track.status === "error") return <LoadErrorAlert message={track.error} onRetry={() => void track.reload()} />
  if (!track.data) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-xl font-semibold text-level-purple-dark">Trilha não encontrada</h1>
        <Link href={ROUTES.tracks} className={cn(levelButtonClasses("primary", "sm"), "mt-6")}>Ver todas as trilhas</Link>
      </div>
    )
  }

  const { courses } = track.data
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section>
        <h1 className="text-3xl font-bold text-level-purple-dark">{track.data.title}</h1>
        <p className="mt-3 text-gray-600">{track.data.description}</p>
        {courses.length === 0 ? (
          <p className="mt-8 text-gray-600">Os cursos desta trilha ainda não foram publicados.</p>
        ) : (
          <ol className="mt-8 space-y-4" aria-label="Cursos da trilha">
            {courses.map((course) => (
              <TrackCourseItem key={course.id} course={course} lockedBy={prerequisiteTitle(course, courses)} />
            ))}
          </ol>
        )}
      </section>
      <TrackCertificatePanel track={track.data} isSignedIn={isSignedIn} />
    </div>
  )
}
