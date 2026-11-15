import type { Metadata } from "next"
import { PageHero } from "@/components/marketing/page-hero"
import { TracksCatalog } from "@/components/tracks/tracks-catalog"

export const metadata: Metadata = {
  title: "Trilha de aprendizado — LevelUSP",
  description: "A trilha do LevelUSP: 7 níveis de Python, do zero à IA. O Nível 1 está disponível; cada nível tem projeto, prova e certificado.",
}

export default function TracksPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Trilha"
        title="Aprenda em sequência, um nível por vez"
        description="São 7 níveis, do zero à IA; o Nível 1 está disponível. Em cada nível você conclui as lições, faz o projeto e a prova e recebe o certificado do nível."
      />
      <section className="pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <TracksCatalog />
        </div>
      </section>
    </>
  )
}
