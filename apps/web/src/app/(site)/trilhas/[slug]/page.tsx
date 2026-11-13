import type { Metadata } from "next"
import { TrackDetail } from "@/components/tracks/track-detail"

export const metadata: Metadata = {
  title: "Trilha — LevelUSP",
  description: "Cursos da trilha, na ordem, com o seu andamento e o certificado da trilha.",
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }): Promise<React.JSX.Element> {
  const { slug } = await params
  return (
    <section className="pb-24 pt-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <TrackDetail slug={slug} />
      </div>
    </section>
  )
}
