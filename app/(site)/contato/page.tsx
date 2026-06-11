import type { Metadata } from "next"
import { Mail, MapPin, MessageSquare, Github, Clock, HelpCircle } from "lucide-react"
import Link from "next/link"
import { PageHero } from "@/components/marketing/page-hero"
import { ContactForm } from "@/components/marketing/contact-form"
import { Reveal } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Contato — Fale com o LevelUSP",
  description:
    "Entre em contato com a equipe do LevelUSP. Tire dúvidas, proponha parcerias, seja voluntário ou fale com o suporte ao aluno.",
}

const CHANNELS = [
  {
    icon: Mail,
    title: "E-mail",
    value: "contato@levelusp.org.br",
    href: "mailto:contato@levelusp.org.br",
  },
  {
    icon: Github,
    title: "GitHub",
    value: "github.com/levelusp",
    href: "https://github.com",
  },
  {
    icon: MapPin,
    title: "Localização",
    value: "Cidade Universitária — São Paulo, SP",
  },
  {
    icon: Clock,
    title: "Atendimento",
    value: "Seg. a sex., das 9h às 18h",
  },
]

export default function ContatoPage() {
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
            {/* Form */}
            <Reveal className="lg:col-span-3">
              <ContactForm />
            </Reveal>

            {/* Channels */}
            <Reveal delay={0.1} className="lg:col-span-2">
              <div className="space-y-4">
                {CHANNELS.map((c) => {
                  const content = (
                    <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF]">
                        <c.icon className="h-6 w-6 text-[#7C3AED]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#4C1D95]">{c.title}</h3>
                        <p className="mt-1 text-sm text-gray-600">{c.value}</p>
                      </div>
                    </div>
                  )
                  return c.href ? (
                    <a
                      key={c.title}
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="block"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={c.title}>{content}</div>
                  )
                })}

                <div className="rounded-2xl bg-[#4C1D95] p-6">
                  <HelpCircle className="h-7 w-7 text-[#A78BFA]" />
                  <h3 className="mt-3 font-semibold text-white">Antes de escrever</h3>
                  <p className="mt-2 text-sm leading-relaxed text-purple-100">
                    Muitas dúvidas já estão respondidas na nossa página de perguntas frequentes.
                  </p>
                  <Link
                    href="/faq"
                    className="mt-4 inline-block text-sm font-semibold text-white underline-offset-4 hover:underline"
                  >
                    Ver perguntas frequentes →
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
