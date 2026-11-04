import type { Metadata } from "next"
import Link from "next/link"
import { Github, GraduationCap, Linkedin, Users } from "lucide-react"
import { ACADEMIC_LEADS, CORE_TEAM, TEAM_SQUADS } from "@/components/marketing/content/team"
import { FinalCta } from "@/components/marketing/final-cta"
import { IconCard } from "@/components/marketing/icon-card"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionHeading } from "@/components/marketing/section-heading"
import { ROUTES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Equipe — Quem constrói o LevelUSP",
  description:
    "Conheça a equipe de docentes, pesquisadores, desenvolvedores e estudantes da USP que constroem o LevelUSP, a plataforma gratuita de ensino de programação.",
}

function SquadsSection() {
  return (
    <section className="pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM_SQUADS.map((squad) => (
            <IconCard key={squad.title} {...squad} />
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function LeadershipSection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Coordenação"
          description="A liderança acadêmica por trás da iniciativa."
          className="mb-12 text-center"
        />

        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ACADEMIC_LEADS.map((lead) => (
            <StaggerItem
              key={lead.name}
              className="rounded-3xl border border-[#E9D5FF] bg-white p-8 text-center shadow-sm"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-level-purple text-2xl font-bold text-white">
                {lead.initials}
              </div>
              <h3 className="mt-5 text-lg font-bold text-level-purple-dark">{lead.name}</h3>
              <p className="mt-1 text-sm font-medium text-level-purple">{lead.role}</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <GraduationCap className="h-3.5 w-3.5" />
                {lead.area}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function CoreTeamSection() {
  return (
    <section className="bg-[#FAFAFA] py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Time que faz acontecer"
          description="Estudantes e profissionais que tocam o dia a dia do projeto."
          className="mb-12 text-center"
        />

        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_TEAM.map((member) => (
            <StaggerItem
              key={member.name}
              className="group flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-level-purple-light text-lg font-bold text-level-purple">
                {member.initials}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-level-purple-dark">{member.name}</h3>
              <p className="mt-1 text-xs text-gray-500">{member.role}</p>
              <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
                  <Github className="h-3.5 w-3.5" />
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-level-purple-light text-level-purple">
                  <Linkedin className="h-3.5 w-3.5" />
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mx-auto mt-14 max-w-2xl rounded-3xl border border-[#E9D5FF] bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-bold text-level-purple-dark">Quer fazer parte?</h3>
          <p className="mt-3 text-gray-600">
            Estamos sempre abertos a voluntários — desenvolvedores, educadores e designers que
            queiram contribuir com a democratização do ensino de tecnologia.
          </p>
          <Link
            href={ROUTES.site.contact}
            className="mt-5 inline-block rounded-2xl bg-level-purple px-7 py-3.5 font-semibold text-white btn-3d"
          >
            Seja voluntário
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

export default function TeamPage() {
  return (
    <>
      <PageHero
        eyebrow="Nossa equipe"
        icon={<Users className="h-4 w-4" />}
        title={
          <>
            Pessoas da <span className="gradient-text">USP</span> dedicadas a ensinar o Brasil
          </>
        }
        description="O LevelUSP é construído por docentes, pesquisadores, desenvolvedores e estudantes voluntários que acreditam no poder transformador da educação pública."
      />
      <SquadsSection />
      <LeadershipSection />
      <CoreTeamSection />
      <FinalCta />
    </>
  )
}
