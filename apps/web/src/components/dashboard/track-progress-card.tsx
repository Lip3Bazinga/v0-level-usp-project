"use client"

import Link from "next/link"
import { ArrowRight, Route } from "lucide-react"
import type { TrackWithCourses } from "@levelusp/contracts"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchTrack, fetchTracks } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { summarizeTrack } from "@/lib/utils/tracks"

/** A trilha em destaque no painel: a primeira publicada, com a situação do aluno em cada curso. */
async function loadFeaturedTrack(): Promise<TrackWithCourses | null> {
  const [first] = await fetchTracks()
  return first ? fetchTrack(first.slug) : null
}

/**
 * Bloco "Sua trilha" do painel: quantos cursos já têm certificado e onde continuar.
 * Some sem aviso quando não há trilha publicada ou a busca falha (o painel segue útil).
 */
export function TrackProgressCard(): React.JSX.Element | null {
  const track = useAsyncResource(loadFeaturedTrack, [])
  if (track.status !== "success" || !track.data || track.data.courses.length === 0) return null

  const summary = summarizeTrack(track.data.courses)
  return (
    <section aria-label="Sua trilha" className="rounded-2xl border border-border bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-level-purple-dark">
        <Route className="h-4 w-4 text-level-purple" aria-hidden="true" /> Sua trilha
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{track.data.title}</p>
      <progress className="mt-3 h-2 w-full" max={summary.total} value={summary.certified} aria-label="Cursos certificados na trilha" />
      <p className="mt-1 text-xs text-muted-foreground">
        {summary.certified} de {summary.total} {summary.total === 1 ? "curso certificado" : "cursos certificados"}
      </p>
      {summary.nextCourse ? (
        <Link href={ROUTES.course(summary.nextCourse.id)} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-level-purple-light px-3 py-2 text-sm font-semibold text-level-purple-dark hover:bg-level-purple-subtle">
          <span className="truncate">Continuar: {summary.nextCourse.title}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : (
        <Link href={ROUTES.track(track.data.slug)} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-level-purple-light px-3 py-2 text-sm font-semibold text-level-purple-dark hover:bg-level-purple-subtle">
          <span>{summary.isCertifiable ? "Emitir o certificado da trilha" : "Ver a trilha"}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}
