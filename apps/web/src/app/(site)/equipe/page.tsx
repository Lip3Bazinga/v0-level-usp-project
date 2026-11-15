import type { Metadata } from "next"
import { GraduationCap, Users } from "lucide-react"
import { TEAM_AFFILIATION, TEAM_AFFILIATION_FULL_NAME, TEAM_MEMBERS } from "@/components/marketing/content/team"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionHeading } from "@/components/marketing/section-heading"

export const metadata: Metadata = {
  title: "Equipe — Quem constrói o LevelUSP",
  description:
    "Conheça quem constrói o LevelUSP, a plataforma gratuita de ensino de programação desenvolvida no DCM/FFCLRP-USP.",
}

function TeamSection(): React.JSX.Element {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Quem faz"
          description="As pessoas por trás do projeto."
          className="mb-12 text-center"
        />

        <Stagger className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {TEAM_MEMBERS.map((member) => (
            <StaggerItem
              key={member.name}
              className="rounded-3xl border border-[#E9D5FF] bg-white p-8 text-center shadow-sm"
            >
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-level-purple text-2xl font-bold text-white">
                {member.initials}
              </div>
              <h3 className="mt-5 text-lg font-bold text-level-purple-dark">{member.name}</h3>
              <p className="mt-1 text-sm font-medium text-level-purple">{member.role}</p>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                {member.affiliation}
              </p>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-sm text-gray-500">
            {TEAM_AFFILIATION}: {TEAM_AFFILIATION_FULL_NAME}.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

export default function TeamPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Nossa equipe"
        icon={<Users className="h-4 w-4" />}
        title={
          <>
            Um projeto da <span className="gradient-text">USP</span> em Ribeirão Preto
          </>
        }
        description="O LevelUSP é desenvolvido no Departamento de Computação e Matemática da FFCLRP-USP."
      />
      <TeamSection />
      <FinalCta />
    </>
  )
}
