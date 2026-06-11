import type { Metadata } from "next"
import { Users, Github, Linkedin, GraduationCap, Code2, Palette, BookOpen, HeartHandshake } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Equipe — Quem constrói o LevelUSP",
  description:
    "Conheça a equipe de docentes, pesquisadores, desenvolvedores e estudantes da USP que constroem o LevelUSP, a plataforma gratuita de ensino de programação.",
}

const LEADERSHIP = [
  { name: "Dra. Helena Martins", role: "Coordenação acadêmica", area: "Docente — Ciência da Computação", initials: "HM" },
  { name: "Prof. Ricardo Alves", role: "Direção pedagógica", area: "Docente — Educação e Tecnologia", initials: "RA" },
  { name: "Dra. Beatriz Nunes", role: "Pesquisa e currículo", area: "Pesquisadora — Ciência da Aprendizagem", initials: "BN" },
]

const TEAM = [
  { name: "Lucas Pereira", role: "Engenharia de Software", initials: "LP" },
  { name: "Ana Carolina Dias", role: "Design de Produto", initials: "AD" },
  { name: "Felipe Santos", role: "Conteúdo e Currículo", initials: "FS" },
  { name: "Juliana Rocha", role: "Engenharia de Software", initials: "JR" },
  { name: "Marcos Vinícius", role: "Infraestrutura", initials: "MV" },
  { name: "Patrícia Gomes", role: "Experiência do Aluno", initials: "PG" },
  { name: "Rafael Costa", role: "Ciência de Dados", initials: "RC" },
  { name: "Camila Ribeiro", role: "Comunidade", initials: "CR" },
]

const SQUADS = [
  { icon: Code2, title: "Engenharia", text: "Constrói a plataforma, a IDE no navegador e o avaliador de código." },
  { icon: BookOpen, title: "Pedagogia", text: "Desenha trilhas, lições e exercícios com base em evidências." },
  { icon: Palette, title: "Design", text: "Cuida da experiência gamificada e da acessibilidade de tudo." },
  { icon: HeartHandshake, title: "Comunidade", text: "Apoia alunos, escolas parceiras e a rede de voluntários." },
]

export default function EquipePage() {
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

      {/* Squads */}
      <section className="pb-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SQUADS.map((s) => (
              <StaggerItem
                key={s.title}
                className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3E8FF]">
                  <s.icon className="h-6 w-6 text-[#7C3AED]" />
                </div>
                <h3 className="text-lg font-semibold text-[#4C1D95]">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Coordenação</h2>
            <p className="mt-4 text-lg text-gray-600">A liderança acadêmica por trás da iniciativa.</p>
          </Reveal>

          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LEADERSHIP.map((p) => (
              <StaggerItem
                key={p.name}
                className="rounded-3xl border border-[#E9D5FF] bg-white p-8 text-center shadow-sm"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#7C3AED] text-2xl font-bold text-white">
                  {p.initials}
                </div>
                <h3 className="mt-5 text-lg font-bold text-[#4C1D95]">{p.name}</h3>
                <p className="mt-1 text-sm font-medium text-[#7C3AED]">{p.role}</p>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {p.area}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Core team */}
      <section className="bg-[#FAFAFA] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Time que faz acontecer</h2>
            <p className="mt-4 text-lg text-gray-600">Estudantes e profissionais que tocam o dia a dia do projeto.</p>
          </Reveal>

          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((p) => (
              <StaggerItem
                key={p.name}
                className="group flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F3E8FF] text-lg font-bold text-[#7C3AED]">
                  {p.initials}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-[#4C1D95]">{p.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{p.role}</p>
                <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#7C3AED]">
                    <Github className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#7C3AED]">
                    <Linkedin className="h-3.5 w-3.5" />
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="mx-auto mt-14 max-w-2xl rounded-3xl border border-[#E9D5FF] bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-[#4C1D95]">Quer fazer parte?</h3>
            <p className="mt-3 text-gray-600">
              Estamos sempre abertos a voluntários — desenvolvedores, educadores e designers que queiram
              contribuir com a democratização do ensino de tecnologia.
            </p>
            <a href="/contato" className="mt-5 inline-block">
              <button className="rounded-2xl bg-[#7C3AED] px-7 py-3.5 font-semibold text-white btn-3d">
                Seja voluntário
              </button>
            </a>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  )
}
