import type { Metadata } from "next"
import { Lightbulb } from "lucide-react"
import { METHOD_COMPARISON, TEACHING_PILLARS } from "@/components/marketing/content/methodology"
import { FinalCta } from "@/components/marketing/final-cta"
import { IdeShowcase } from "@/components/marketing/ide-showcase"
import { MethodSection } from "@/components/marketing/method-section"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { ScienceSection } from "@/components/marketing/science-section"
import { SectionHeading } from "@/components/marketing/section-heading"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Metodologia — Como ensinamos no LevelUSP",
  description:
    "Conheça a metodologia do LevelUSP: aprendizagem ativa, prática deliberada numa IDE no navegador e gamificação, tudo fundamentado em ciência cognitiva.",
}

function PillarsSection() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Os pilares do nosso ensino"
          description="Seis princípios pedagógicos que estruturam cada trilha e cada lição da plataforma."
        />

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEACHING_PILLARS.map((pillar) => (
            <StaggerItem
              key={pillar.title}
              className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple-light">
                <pillar.icon className="h-7 w-7 text-level-purple" />
              </div>
              <h3 className="text-lg font-semibold text-level-purple-dark">{pillar.title}</h3>
              <p className="mt-2 leading-relaxed text-gray-600">{pillar.description}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function ComparisonSection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="O que nos torna diferentes"
          description="Por que a experiência LevelUSP funciona melhor."
          className="mb-12 text-center"
        />

        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-[#E9D5FF]">
            <div className="grid grid-cols-2 bg-level-purple-light text-sm font-semibold">
              <div className="px-6 py-4 text-gray-500">Ensino tradicional</div>
              <div className="px-6 py-4 text-level-purple-dark">LevelUSP</div>
            </div>
            {METHOD_COMPARISON.map((row, index) => (
              <div
                key={row.traditional}
                className={cn("grid grid-cols-2", index % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]")}
              >
                <div className="px-6 py-4 text-sm text-gray-500 line-through decoration-gray-300">
                  {row.traditional}
                </div>
                <div className="px-6 py-4 text-sm font-medium text-level-purple-dark">
                  {row.levelUsp}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function MethodologyPage() {
  return (
    <>
      <PageHero
        eyebrow="Metodologia"
        icon={<Lightbulb className="h-4 w-4" />}
        title={
          <>
            Aprender programação <span className="gradient-text">fazendo</span>, não decorando
          </>
        }
        description="Nossa abordagem une o que há de mais consolidado na ciência da aprendizagem com uma plataforma gamificada que coloca você escrevendo código real desde o primeiro minuto."
      />
      <PillarsSection />
      <MethodSection />
      <IdeShowcase />
      <ComparisonSection />
      <ScienceSection />
      <FinalCta
        title="Veja a metodologia em ação"
        description="A melhor forma de entender nosso método é experimentá-lo. Crie sua conta gratuita e escreva seu primeiro programa em minutos."
      />
    </>
  )
}
