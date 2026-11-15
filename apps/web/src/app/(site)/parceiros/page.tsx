import type { Metadata } from "next"
import { Handshake } from "lucide-react"
import { PARTNERS } from "@/components/marketing/content/partners"
import { FinalCta } from "@/components/marketing/final-cta"
import { Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionHeading } from "@/components/marketing/section-heading"

export const metadata: Metadata = {
  title: "Parceiros — Onde o LevelUSP é desenvolvido",
  description:
    "Conheça a instituição que apoia o LevelUSP.",
}

function PartnerWallSection(): React.JSX.Element {
  return (
    <section className="pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Quem caminha com a gente"
          description="A instituição que apoia o LevelUSP."
          className="mb-12 text-center"
        />

        <Stagger className="mx-auto grid max-w-xl gap-4">
          {PARTNERS.map((partner) => (
            <StaggerItem
              key={partner.name}
              className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-level-purple">{partner.role}</p>
              <h3 className="mt-2 text-lg font-bold text-level-purple-dark">{partner.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{partner.fullName}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default function PartnersPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Parceiros"
        icon={<Handshake className="h-4 w-4" />}
        title={
          <>
            Construímos isso <span className="gradient-text">juntos</span>
          </>
        }
        description="O LevelUSP é um projeto de TCC desenvolvido no DCM/FFCLRP-USP."
      />
      <PartnerWallSection />
      <FinalCta />
    </>
  )
}
