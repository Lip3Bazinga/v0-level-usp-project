"use client"

import Link from "next/link"
import { Play } from "lucide-react"
import { ROUTES } from "@/lib/constants"
import { Reveal } from "./motion-primitives"

const DEFAULT_TITLE = "Comece sua jornada hoje. É de graça."
const DEFAULT_DESCRIPTION =
  "Junte-se a milhares de brasileiros aprendendo programação com a metodologia da USP. Sem mensalidade, sem pegadinhas — e com certificado verificável para o seu currículo."

interface FinalCtaProps {
  title?: string
  description?: string
}

/** Chamada final para criar conta, no fim de quase todas as páginas do site. */
export function FinalCta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: FinalCtaProps): React.JSX.Element {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="glass-purple relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
            <div className="aurora-bg opacity-70" aria-hidden />
            <div className="relative">
              <h2 className="text-balance text-4xl font-bold text-level-purple-dark sm:text-5xl">
                {title}
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-gray-700">
                {description}
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href={ROUTES.signup}
                  className="inline-flex items-center gap-2 rounded-2xl bg-level-purple px-10 py-5 text-lg font-bold text-white btn-3d"
                >
                  <Play className="h-5 w-5" />
                  Criar conta grátis
                </Link>
                <Link
                  href={ROUTES.login}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-level-purple-medium bg-white/60 px-8 py-4 text-lg font-semibold text-level-purple backdrop-blur transition-all hover:bg-white"
                >
                  Já tenho conta
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
