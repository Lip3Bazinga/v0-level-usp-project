"use client"

import Link from "next/link"
import { Lock } from "lucide-react"
import type { LessonSummary } from "@levelusp/contracts"
import { ROUTES } from "@/lib/constants"

interface ProjectLockedNoticeProps {
  /** Lições do curso que ainda faltam, na ordem do curso (nunca vazio: sem pendências o aviso não aparece). */
  pendingLessons: readonly LessonSummary[]
}

/** Até aqui a lista já vem aberta; acima disso o aluno abre para não empurrar a lição para fora da tela. */
const MAX_LESSONS_SHOWN_OPEN = 6

/**
 * Aviso fixo no topo do projeto do nível enquanto ele está bloqueado: diz quantas lições faltam
 * e leva a cada uma. Quem bloqueia é a API (`PROJECT_LOCKED`); o aviso só explica o porquê.
 */
export function ProjectLockedNotice({ pendingLessons }: ProjectLockedNoticeProps): React.JSX.Element {
  const count = pendingLessons.length
  return (
    <section aria-label="Projeto bloqueado" className="shrink-0 border-b border-yellow-300 bg-yellow-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-yellow-900">Projeto bloqueado</h2>
          <p className="mt-0.5 text-sm text-yellow-900">
            {count === 1
              ? "Falta 1 lição do curso para liberar o projeto."
              : `Faltam ${count} lições do curso para liberar o projeto.`}{" "}
            Você pode ler os passos, mas eles só são aceitos depois que {count === 1 ? "ela estiver concluída" : "elas estiverem concluídas"}.
          </p>
          <details className="mt-2" open={count <= MAX_LESSONS_SHOWN_OPEN}>
            <summary className="cursor-pointer text-sm font-semibold text-yellow-900">{count === 1 ? "Lição que falta" : "Lições que faltam"}</summary>
            <ol className="mt-2 grid max-h-40 gap-x-6 gap-y-1 overflow-y-auto text-sm sm:grid-cols-2 lg:grid-cols-3">
              {pendingLessons.map((pending) => (
                <li key={pending.id} className="truncate">
                  <Link href={ROUTES.lesson(pending.id)} className="text-level-purple-dark underline hover:text-level-purple">
                    {pending.title}
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </div>
    </section>
  )
}
