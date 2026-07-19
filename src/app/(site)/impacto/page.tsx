import type { Metadata } from "next"
import { Quote, TrendingUp, GraduationCap, Briefcase, HeartHandshake, Star } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { ImpactSection } from "@/components/marketing/impact-section"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem, GrowBar } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Impacto — Resultados e histórias do LevelUSP",
  description:
    "Veja o impacto social do LevelUSP: estudantes alcançados em todo o Brasil, histórias de transformação e contribuição para os Objetivos de Desenvolvimento Sustentável.",
}

const REGIONS = [
  { region: "Sudeste", pct: 38 },
  { region: "Nordeste", pct: 27 },
  { region: "Sul", pct: 15 },
  { region: "Norte", pct: 11 },
  { region: "Centro-Oeste", pct: 9 },
]

const OUTCOMES = [
  { icon: GraduationCap, stat: "72%", label: "concluem a primeira trilha que iniciam" },
  { icon: Briefcase, stat: "1.200+", label: "alunos relataram nova vaga ou estágio em tech" },
  { icon: TrendingUp, stat: "8 em 10", label: "se sentem mais confiantes para aprender sozinhos" },
  { icon: HeartHandshake, stat: "140+", label: "escolas públicas parceiras em todo o país" },
]

const TESTIMONIALS = [
  {
    quote:
      "Eu nunca tinha programado e achava que era coisa de gênio. Em três meses no LevelUSP eu fiz meu primeiro projeto de análise de dados e hoje faço estágio numa startup.",
    name: "Mariana Souza",
    role: "Estudante, Recife — PE",
  },
  {
    quote:
      "Moro numa cidade pequena no interior e não tinha curso de tecnologia perto. A plataforma foi minha porta de entrada para a área. Tudo de graça e em português.",
    name: "João Pedro Lima",
    role: "Estudante, Imperatriz — MA",
  },
  {
    quote:
      "Como professora da rede pública, uso o LevelUSP com minhas turmas. Os alunos se engajam muito mais com a gamificação e a prática na IDE do que com aulas expositivas.",
    name: "Cláudia Ferreira",
    role: "Professora, Goiânia — GO",
  },
]

const SDGS = [
  { num: "4", title: "Educação de qualidade", text: "Acesso gratuito a educação técnica de excelência." },
  { num: "8", title: "Trabalho decente", text: "Qualificação para empregos do futuro digital." },
  { num: "10", title: "Redução das desigualdades", text: "Levando tecnologia a quem tem menos acesso." },
]

export default function ImpactoPage() {
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

      {/* Reuse animated stats */}
      <ImpactSection />

      {/* Outcomes */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Resultados que importam</h2>
            <p className="mt-4 text-lg text-gray-600">
              Indicadores acompanhados continuamente para garantir que estamos cumprindo nossa missão.
            </p>
          </Reveal>

          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {OUTCOMES.map((o) => (
              <StaggerItem
                key={o.label}
                className="rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-sm"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                  <o.icon className="h-7 w-7 text-[#7C3AED]" />
                </div>
                <p className="text-3xl font-bold text-[#4C1D95]">{o.stat}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{o.label}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Regional distribution */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Presença em todo o Brasil</h2>
            <p className="mt-4 text-lg text-gray-600">
              Estudantes ativos distribuídos pelas cinco regiões do país.
            </p>
          </Reveal>

          <Reveal>
            <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              {REGIONS.map((r, i) => (
                <div key={r.region}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#4C1D95]">{r.region}</span>
                    <span className="text-gray-500">{r.pct}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#F3E8FF]">
                    <GrowBar pct={r.pct} delay={i * 0.1} className="h-full rounded-full bg-[#7C3AED]" />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-[#FAFAFA] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Histórias de quem aprendeu</h2>
            <p className="mt-4 text-lg text-gray-600">Vozes reais de estudantes e educadores de todo o país.</p>
          </Reveal>

          <Stagger className="grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <StaggerItem
                key={t.name}
                className="flex flex-col rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
              >
                <Quote className="mb-4 h-8 w-8 text-[#A78BFA]" />
                <p className="flex-1 leading-relaxed text-gray-700">{t.quote}</p>
                <div className="mt-6 flex items-center gap-1 text-[#7C3AED]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <div className="mt-3">
                  <p className="font-semibold text-[#4C1D95]">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* SDGs */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Alinhados à agenda global</h2>
            <p className="mt-4 text-lg text-gray-600">
              Nossa atuação contribui diretamente para os Objetivos de Desenvolvimento Sustentável da ONU.
            </p>
          </Reveal>

          <Stagger className="grid gap-6 sm:grid-cols-3">
            {SDGS.map((s) => (
              <StaggerItem
                key={s.num}
                className="rounded-3xl border border-[#E9D5FF] bg-white p-8 shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED] text-lg font-bold text-white">
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold text-[#4C1D95]">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-gray-600">{s.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <FinalCta
        title="Faça parte dessa transformação"
        description="Cada novo estudante amplia nosso impacto. Crie sua conta gratuita e some-se a milhares de brasileiros aprendendo tecnologia."
      />
    </>
  )
}
