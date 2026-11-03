import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { HelpCircle, MessageSquare } from "lucide-react"
import { ContactForm } from "@/components/marketing/contact-form"
import { CONTACT_CHANNELS } from "@/components/marketing/content/contact"
import { Reveal } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { ROUTES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Contato — Fale com o LevelUSP",
  description:
    "Entre em contato com a equipe do LevelUSP. Tire dúvidas, proponha parcerias, seja voluntário ou fale com o suporte ao aluno.",
}

type ContactChannel = (typeof CONTACT_CHANNELS)[number]

function ChannelLink({ href, children }: { href: string; children: ReactNode }): React.JSX.Element {
  const isExternal = href.startsWith("http")
  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="block"
    >
      {children}
    </a>
  )
}

function ChannelCard({ channel }: { channel: ContactChannel }): React.JSX.Element {
  const card = (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
        <channel.icon className="h-6 w-6 text-level-purple" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-level-purple-dark">{channel.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{channel.value}</p>
      </div>
    </div>
  )
  return channel.href ? <ChannelLink href={channel.href}>{card}</ChannelLink> : <div>{card}</div>
}

function FaqReminder(): React.JSX.Element {
  return (
    <div className="rounded-2xl bg-level-purple-dark p-6">
      <HelpCircle className="h-7 w-7 text-level-purple-medium" />
      <h3 className="mt-3 font-semibold text-white">Antes de escrever</h3>
      <p className="mt-2 text-sm leading-relaxed text-purple-100">
        Muitas dúvidas já estão respondidas na nossa página de perguntas frequentes.
      </p>
      <Link
        href={ROUTES.site.faq}
        className="mt-4 inline-block text-sm font-semibold text-white underline-offset-4 hover:underline"
      >
        Ver perguntas frequentes →
      </Link>
    </div>
  )
}

export default function ContactPage(): React.JSX.Element {
  return (
    <>
      <PageHero
        eyebrow="Fale com a gente"
        icon={<MessageSquare className="h-4 w-4" />}
        title={
          <>
            Estamos aqui para <span className="gradient-text">ajudar</span>
          </>
        }
        description="Dúvidas, sugestões, parcerias ou vontade de ser voluntário? Envie sua mensagem e nossa equipe retornará o quanto antes."
      />

      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-5">
            <Reveal className="lg:col-span-3">
              <ContactForm />
            </Reveal>

            <Reveal delay={0.1} className="lg:col-span-2">
              <div className="space-y-4">
                {CONTACT_CHANNELS.map((channel) => (
                  <ChannelCard key={channel.title} channel={channel} />
                ))}
                <FaqReminder />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
