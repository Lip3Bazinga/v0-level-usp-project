"use client"

import Link from "next/link"
import { Play } from "lucide-react"
import { Reveal } from "./motion-primitives"

interface FinalCtaProps {
  title?: string
  description?: string
}

export function FinalCta({
  title = "Comece sua jornada hoje. É de graça.",
  description = "Junte-se a milhares de brasileiros aprendendo programação com a metodologia da USP. Sem mensalidade, sem pegadinhas — e com certificado verificável para o seu currículo.",
}: FinalCtaProps) {
  return (
    <section className="py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="glass-purple relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16">
            <div className="aurora-bg opacity-70" aria-hidden />
            <div className="relative">
              <h2 className="text-balance text-4xl font-bold text-[#4C1D95] sm:text-5xl">{title}</h2>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-gray-700">{description}</p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <button className="inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-10 py-5 text-lg font-bold text-white btn-3d">
                    <Play className="h-5 w-5" />
                    Criar conta grátis
                  </button>
                </Link>
                <Link href="/login">
                  <button className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#A78BFA] bg-white/60 px-8 py-4 text-lg font-semibold text-[#7C3AED] backdrop-blur transition-all hover:bg-white">
                    Já tenho conta
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
