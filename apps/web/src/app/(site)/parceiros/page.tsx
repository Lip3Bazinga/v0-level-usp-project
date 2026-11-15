import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Handshake } from "lucide-react"
import { PARTNERS, PARTNERSHIP_BENEFITS } from "@/components/marketing/content/partners"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionHeading } from "@/components/marketing/section-heading"
import { ROUTES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Parceiros — Quem apoia o LevelUSP",
  description:
    "Conheça quem apoia o LevelUSP e saiba como a sua organização pode fazer parte.",
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

function BecomePartnerSection(): React.JSX.Element {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-level-purple-dark">
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="p-10 lg:p-14">
                <h2 className="text-3xl font-bold text-white">Seja um parceiro</h2>
                <p className="mt-4 leading-relaxed text-purple-100">
                  Sua instituição ou empresa pode ampliar o alcance da educação em tecnologia no
                  Brasil.
                </p>
                <Link
                  href={ROUTES.site.contact}
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-level-purple-dark transition-transform hover:scale-105"
                >
                  Quero ser parceiro
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <div className="bg-white/5 p-10 lg:p-14">
                <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-purple-200">
                  O que oferecemos
                </h3>
                <ul className="space-y-4">
                  {PARTNERSHIP_BENEFITS.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3 text-purple-50">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-level-purple-medium" />
                      <span className="leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
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
        description="A democratização do ensino de tecnologia depende de instituições que compartilham essa missão."
      />
      <PartnerWallSection />
      <BecomePartnerSection />
      <FinalCta />
    </>
  )
}
