import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Handshake } from "lucide-react"
import {
  PARTNERSHIP_BENEFITS,
  PARTNER_CATEGORIES,
  PARTNER_NAMES,
} from "@/components/marketing/content/partners"
import { FinalCta } from "@/components/marketing/final-cta"
import { IconCard } from "@/components/marketing/icon-card"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionHeading } from "@/components/marketing/section-heading"
import { ROUTES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Parceiros — Quem apoia o LevelUSP",
  description:
    "Conheça as instituições de ensino, empresas e organizações que apoiam o LevelUSP e saiba como sua organização pode fazer parte dessa rede.",
}

function CategoriesSection() {
  return (
    <section className="pb-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PARTNER_CATEGORIES.map((category) => (
            <IconCard key={category.title} {...category} />
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function PartnerWallSection() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Quem caminha com a gente"
          description="Instituições e organizações que apoiam o LevelUSP em diferentes frentes."
          className="mb-12 text-center"
        />

        <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {PARTNER_NAMES.map((partnerName) => (
            <StaggerItem
              key={partnerName}
              className="flex h-28 items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="text-sm font-semibold text-level-purple-dark">{partnerName}</span>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Nomes ilustrativos da rede de apoio institucional do projeto.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

function BecomePartnerSection() {
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
                  Brasil. Junte-se a uma rede comprometida com o impacto social.
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

export default function PartnersPage() {
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
        description="A democratização do ensino de tecnologia só é possível com uma rede de instituições, escolas e empresas que compartilham nossa missão."
      />
      <CategoriesSection />
      <PartnerWallSection />
      <BecomePartnerSection />
      <FinalCta />
    </>
  )
}
