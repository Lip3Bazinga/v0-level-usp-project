import type { Metadata } from "next"
import { Handshake, Building2, School, Code2, Heart, ArrowRight, CheckCircle2 } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Parceiros — Quem apoia o LevelUSP",
  description:
    "Conheça as instituições de ensino, empresas e organizações que apoiam o LevelUSP e saiba como sua organização pode fazer parte dessa rede.",
}

const CATEGORIES = [
  {
    icon: Building2,
    title: "Apoio institucional",
    text: "Universidades e órgãos públicos que sustentam a infraestrutura e a credibilidade acadêmica do projeto.",
  },
  {
    icon: School,
    title: "Rede de escolas",
    text: "Escolas públicas e privadas que adotam a plataforma com seus estudantes em sala de aula.",
  },
  {
    icon: Code2,
    title: "Parceiros de tecnologia",
    text: "Empresas que doam créditos de nuvem, ferramentas e mentoria técnica para a equipe.",
  },
  {
    icon: Heart,
    title: "Patrocínio social",
    text: "Organizações e doadores que financiam bolsas, eventos e a expansão para novas regiões.",
  },
]

// Placeholder partner names rendered as branded text logos (no fake brand logos)
const PARTNERS = [
  "Universidade de São Paulo",
  "Instituto de Computação",
  "Secretaria de Educação",
  "Fundação de Pesquisa",
  "Hub de Inovação",
  "Rede Pública de Ensino",
  "Centro de Tecnologia",
  "Programa de Extensão",
]

const BENEFITS = [
  "Acesso a relatórios de impacto e engajamento das suas turmas",
  "Material didático aberto e suporte pedagógico da equipe USP",
  "Co-criação de trilhas voltadas à sua comunidade",
  "Visibilidade como apoiador da democratização da tecnologia",
]

export default function ParceirosPage() {
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

      {/* Partner categories */}
      <section className="pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c) => (
              <StaggerItem
                key={c.title}
                className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E8FF]">
                  <c.icon className="h-6 w-6 text-[#7C3AED]" />
                </div>
                <h3 className="text-lg font-semibold text-[#4C1D95]">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{c.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Partner wall */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Quem caminha com a gente</h2>
            <p className="mt-4 text-lg text-gray-600">
              Instituições e organizações que apoiam o LevelUSP em diferentes frentes.
            </p>
          </Reveal>

          <Stagger className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {PARTNERS.map((p) => (
              <StaggerItem
                key={p}
                className="flex h-28 items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-sm font-semibold text-[#4C1D95]">{p}</span>
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

      {/* Become a partner */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="overflow-hidden rounded-3xl bg-[#4C1D95]">
              <div className="grid gap-0 lg:grid-cols-2">
                <div className="p-10 lg:p-14">
                  <h2 className="text-3xl font-bold text-white">Seja um parceiro</h2>
                  <p className="mt-4 leading-relaxed text-purple-100">
                    Sua instituição ou empresa pode ampliar o alcance da educação em tecnologia no Brasil.
                    Junte-se a uma rede comprometida com o impacto social.
                  </p>
                  <a href="/contato" className="mt-8 inline-block">
                    <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-[#4C1D95] transition-transform hover:scale-105">
                      Quero ser parceiro
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </a>
                </div>
                <div className="bg-white/5 p-10 lg:p-14">
                  <h3 className="mb-6 text-sm font-semibold uppercase tracking-wider text-purple-200">
                    O que oferecemos
                  </h3>
                  <ul className="space-y-4">
                    {BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-3 text-purple-50">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#A78BFA]" />
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  )
}
