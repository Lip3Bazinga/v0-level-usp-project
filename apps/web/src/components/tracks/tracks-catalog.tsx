"use client"

import Link from "next/link"
import { ArrowRight, Route } from "lucide-react"
import { LoadErrorAlert } from "@/components/design-system/load-error-alert"
import { Spinner } from "@/components/design-system/spinner"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchTracks } from "@/lib/api"
import { ROUTES } from "@/lib/constants"

/** Catálogo público de trilhas: cada trilha é uma sequência de cursos (níveis) com certificado próprio. */
export function TracksCatalog(): React.JSX.Element {
  const tracks = useAsyncResource(fetchTracks, [], { errorMessage: "Não foi possível carregar as trilhas." })

  if (tracks.status === "loading") {
    return <div className="flex justify-center py-16" role="status" aria-label="Carregando trilhas"><Spinner /></div>
  }
  if (tracks.status === "error") return <LoadErrorAlert message={tracks.error} onRetry={() => void tracks.reload()} />
  if (tracks.data.length === 0) {
    return <p className="py-16 text-center text-gray-600">Nenhuma trilha publicada no momento.</p>
  }

  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {tracks.data.map((track) => (
        <li key={track.id}>
          <Link
            href={ROUTES.track(track.slug)}
            className="group flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-100"
          >
            <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple">
              <Route className="h-7 w-7 text-white" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-bold text-level-purple-dark">{track.title}</h2>
            <p className="mt-2 flex-1 text-sm text-gray-600">{track.description}</p>
            <p className="mt-5 flex items-center justify-between text-sm font-semibold text-level-purple">
              <span>{track.course_count === 1 ? "1 curso disponível" : `${track.course_count ?? 0} cursos disponíveis`}</span>
              <span className="flex items-center gap-1">
                Ver trilha <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
