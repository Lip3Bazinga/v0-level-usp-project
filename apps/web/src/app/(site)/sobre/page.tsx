import type { Metadata } from "next"
import { Eye, Sparkles, Target } from "lucide-react"
import {
  ABOUT_ORIGIN,
  ABOUT_PRINCIPLES,
  ABOUT_VALUES,
} from "@/components/marketing/content/about"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionHeading } from "@/components/marketing/section-heading"

export const metadata: Metadata = {
  title: "Sobre o LevelUSP — Nossa missão e história",
  description:
    "Conheça a missão, a visão, os valores e a história do LevelUSP, a iniciativa gratuita da Universidade de São Paulo para democratizar o ensino de computação no Brasil.",
}

function IntroSection(): React.JSX.Element {
  return (
    <section className="pb-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="space-y-6 text-lg leading-relaxed text-gray-700">
            <p>
              Programar deixou de ser uma habilidade de nicho para se tornar uma das competências
              mais determinantes do século XXI. No entanto, no Brasil, esse conhecimento ainda está
              concentrado em poucas instituições, grandes cidades e em quem pode pagar por cursos
              caros.
            </p>
            <p>
              Acreditamos que a universidade pública tem o dever de devolver à sociedade o
              conhecimento que produz. Por isso, reunimos docentes, pesquisadores e estudantes da
              USP para construir uma plataforma{" "}
              <strong className="text-level-purple-dark">
                gratuita, gamificada e cientificamente embasada
              </strong>{" "}
              — capaz de levar a programação a qualquer pessoa, em qualquer lugar do país.
            </p>
          </div>
        </Reveal>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
          {ABOUT_PRINCIPLES.map((principle) => (
            <StaggerItem key={principle.label} className="glass-purple rounded-2xl p-6 text-center">
              <principle.icon className="mx-auto mb-3 h-7 w-7 text-level-purple" />
              <p className="text-xl font-bold text-level-purple-dark">{principle.value}</p>
              <p className="mt-1 text-sm text-gray-600">{principle.label}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function MissionVisionSection(): React.JSX.Element {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl border border-[#E9D5FF] bg-white p-10 shadow-sm">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-level-purple-dark">Nossa missão</h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-700">
                Democratizar o ensino de computação no Brasil, oferecendo educação gratuita, de alta
                qualidade e acessível, que transforme a vida de estudantes independentemente de sua
                origem socioeconômica ou localização.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-[#E9D5FF] bg-level-purple-dark p-10 shadow-sm">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Eye className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Nossa visão</h2>
              <p className="mt-4 text-lg leading-relaxed text-purple-100">
                Ser a porta de entrada para a tecnologia de milhões de brasileiros, formando uma
                nova geração de profissionais e cidadãos digitais — e provando que a universidade
                pública pode educar em escala nacional.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function ValuesSection(): React.JSX.Element {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Nossos valores"
          description="Princípios que guiam cada decisão que tomamos na construção da plataforma."
        />

        <Stagger className="grid gap-6 sm:grid-cols-2">
          {ABOUT_VALUES.map((value) => (
            <StaggerItem
              key={value.title}
              className="flex gap-5 rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-level-purple-light">
                <value.icon className="h-7 w-7 text-level-purple" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-level-purple-dark">{value.title}</h3>
                <p className="mt-2 leading-relaxed text-gray-600">{value.description}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function OriginSection(): React.JSX.Element {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="De onde vem o projeto"
          description="O LevelUSP nasceu na universidade pública."
          className="mb-10 text-center"
        />
        <Reveal>
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-level-purple-dark">{ABOUT_ORIGIN.title}</h3>
            <p className="mt-2 leading-relaxed text-gray-600">{ABOUT_ORIGIN.description}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function AboutPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Sobre o projeto"
        icon={<Sparkles className="h-4 w-4" />}
        title={
          <>
            Tecnologia como ferramenta de{" "}
            <span className="gradient-text">transformação social</span>
          </>
        }
        description="O LevelUSP é uma iniciativa de extensão da Universidade de São Paulo que nasceu para enfrentar uma desigualdade concreta: o acesso ao ensino de computação no Brasil."
      />
      <IntroSection />
      <MissionVisionSection />
      <ValuesSection />
      <OriginSection />
      <FinalCta />
    </>
  )
}
