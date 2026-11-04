import type { Metadata } from "next"
import { Quote, Star, TrendingUp } from "lucide-react"
import {
  LEARNING_OUTCOMES,
  STUDENTS_BY_REGION,
  SUSTAINABLE_DEVELOPMENT_GOALS,
  TESTIMONIALS,
  TESTIMONIAL_STAR_COUNT,
} from "@/components/marketing/content/impact"
import { FinalCta } from "@/components/marketing/final-cta"
import { ImpactSection } from "@/components/marketing/impact-section"
import { GrowBar, Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionHeading } from "@/components/marketing/section-heading"

export const metadata: Metadata = {
  title: "Impacto — Resultados e histórias do LevelUSP",
  description:
    "Veja o impacto social do LevelUSP: estudantes alcançados em todo o Brasil, histórias de transformação e contribuição para os Objetivos de Desenvolvimento Sustentável.",
}

const REGION_BAR_STAGGER_SECONDS = 0.1

function OutcomesSection(): React.JSX.Element {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Resultados que importam"
          description="Indicadores acompanhados continuamente para garantir que estamos cumprindo nossa missão."
        />

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LEARNING_OUTCOMES.map((outcome) => (
            <StaggerItem
              key={outcome.label}
              className="rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple-light">
                <outcome.icon className="h-7 w-7 text-level-purple" />
              </div>
              <p className="text-3xl font-bold text-level-purple-dark">{outcome.value}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{outcome.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function RegionsSection(): React.JSX.Element {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Presença em todo o Brasil"
          description="Estudantes ativos distribuídos pelas cinco regiões do país."
          className="mb-10 text-center"
        />

        <Reveal>
          <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            {STUDENTS_BY_REGION.map((share, index) => (
              <div key={share.region}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-level-purple-dark">{share.region}</span>
                  <span className="text-gray-500">{share.percent}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-level-purple-light">
                  <GrowBar
                    percent={share.percent}
                    delay={index * REGION_BAR_STAGGER_SECONDS}
                    className="h-full rounded-full bg-level-purple"
                  />
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function TestimonialsSection(): React.JSX.Element {
  return (
    <section className="bg-[#FAFAFA] py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Histórias de quem aprendeu"
          description="Vozes reais de estudantes e educadores de todo o país."
        />

        <Stagger className="grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <StaggerItem
              key={testimonial.name}
              className="flex flex-col rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
            >
              <Quote className="mb-4 h-8 w-8 text-level-purple-medium" />
              <p className="flex-1 leading-relaxed text-gray-700">{testimonial.quote}</p>
              <div className="mt-6 flex items-center gap-1 text-level-purple">
                {Array.from({ length: TESTIMONIAL_STAR_COUNT }, (_, starIndex) => (
                  <Star key={starIndex} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <div className="mt-3">
                <p className="font-semibold text-level-purple-dark">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.role}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function SustainableGoalsSection(): React.JSX.Element {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Alinhados à agenda global"
          description="Nossa atuação contribui diretamente para os Objetivos de Desenvolvimento Sustentável da ONU."
        />

        <Stagger className="grid gap-6 sm:grid-cols-3">
          {SUSTAINABLE_DEVELOPMENT_GOALS.map((goal) => (
            <StaggerItem
              key={goal.number}
              className="rounded-3xl border border-[#E9D5FF] bg-white p-8 shadow-sm"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple text-lg font-bold text-white">
                {goal.number}
              </div>
              <h3 className="text-lg font-semibold text-level-purple-dark">{goal.title}</h3>
              <p className="mt-2 leading-relaxed text-gray-600">{goal.description}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default function ImpactPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Nosso impacto"
        icon={<TrendingUp className="h-4 w-4" />}
        title={
          <>
            Resultados que se medem em <span className="gradient-text">vidas transformadas</span>
          </>
        }
        description="Mais do que números, o LevelUSP constrói trajetórias. Conheça o alcance da iniciativa e as histórias de quem aprendeu a programar com a gente."
      />
      <ImpactSection />
      <OutcomesSection />
      <RegionsSection />
      <TestimonialsSection />
      <SustainableGoalsSection />
      <FinalCta
        title="Faça parte dessa transformação"
        description="Cada novo estudante amplia nosso impacto. Crie sua conta gratuita e some-se a milhares de brasileiros aprendendo tecnologia."
      />
    </>
  )
}
