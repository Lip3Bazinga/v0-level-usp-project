import type { Metadata } from "next"
import { PageHero } from "@/components/marketing/page-hero"
import { TracksCatalog } from "@/components/tracks/tracks-catalog"

export const metadata: Metadata = {
  title: "Trilhas de aprendizado — LevelUSP",
  description: "Trilhas do LevelUSP: sequências de cursos de Python, do iniciante à IA, cada curso com prova, projeto e certificado.",
}

export default function TracksPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Trilhas"
        title="Aprenda em sequência, um nível por vez"
        description="Cada trilha encadeia cursos certificáveis. Você conclui as lições, faz o projeto e a prova de cada nível e, ao final, recebe o certificado da trilha."
      />
      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <TracksCatalog />
        </div>
      </section>
    </>
  )
}
