import type { Metadata } from "next"
import Link from "next/link"
import { HelpCircle, MessageCircle } from "lucide-react"
import { FAQ_GROUPS } from "@/components/marketing/content/faq"
import { FaqAccordion } from "@/components/marketing/faq-accordion"
import { Reveal } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { ROUTES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Perguntas frequentes — LevelUSP",
  description:
    "Tire suas dúvidas sobre o LevelUSP: gratuidade, pré-requisitos, certificados, funcionamento da IDE no navegador e muito mais.",
}

function ContactCallout(): React.JSX.Element {
  return (
    <section className="pb-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="glass-purple flex flex-col items-center rounded-3xl p-10 text-center">
            <MessageCircle className="mb-4 h-10 w-10 text-level-purple" />
            <h2 className="text-2xl font-bold text-level-purple-dark">Ainda tem dúvidas?</h2>
            <p className="mt-3 max-w-md text-gray-600">
              Nossa equipe está pronta para ajudar. Envie sua mensagem e responderemos o quanto
              antes.
            </p>
            <Link
              href={ROUTES.site.contact}
              className="mt-6 inline-block rounded-2xl bg-level-purple px-8 py-4 font-semibold text-white btn-3d"
            >
              Falar com a equipe
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function FaqPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Perguntas frequentes"
        icon={<HelpCircle className="h-4 w-4" />}
        title={
          <>
            Tudo que você precisa <span className="gradient-text">saber</span>
          </>
        }
        description="Reunimos as dúvidas mais comuns sobre o LevelUSP. Se ainda restar alguma pergunta, fale com a gente."
      />

      <section className="pb-16">
        <div className="mx-auto max-w-3xl space-y-14 px-4 sm:px-6 lg:px-8">
          {FAQ_GROUPS.map((group) => (
            <Reveal key={group.title}>
              <h2 className="mb-5 text-xl font-bold text-level-purple-dark">{group.title}</h2>
              <FaqAccordion items={group.items} />
            </Reveal>
          ))}
        </div>
      </section>

      <ContactCallout />
    </>
  )
}
