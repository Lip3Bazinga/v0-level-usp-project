import type { Metadata } from "next"
import Link from "next/link"
import { Code2, BarChart3, Database, Globe2, Cpu, Clock, BookOpen, Trophy, CheckCircle2, ArrowRight } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Trilhas de aprendizado — Currículo do LevelUSP",
  description:
    "Explore as trilhas de aprendizado do LevelUSP: Python, Ciência de Dados, Desenvolvimento Web e mais. Currículo estruturado, gratuito e baseado em prática real.",
}

const TRACKS = [
  {
    icon: Code2,
    title: "Fundamentos de Python",
    level: "Iniciante",
    lessons: 42,
    hours: 30,
    color: "#7C3AED",
    desc: "Do zero ao domínio da lógica de programação: variáveis, condicionais, laços, funções e estruturas de dados.",
    modules: ["Lógica e variáveis", "Estruturas de controle", "Funções e módulos", "Listas, dicionários e arquivos"],
  },
  {
    icon: BarChart3,
    title: "Ciência de Dados",
    level: "Intermediário",
    lessons: 38,
    hours: 45,
    color: "#6D28D9",
    desc: "Manipule, analise e visualize dados reais com Pandas, NumPy e Matplotlib em projetos práticos.",
    modules: ["NumPy e arrays", "Pandas e DataFrames", "Visualização de dados", "Projeto: análise real"],
  },
  {
    icon: Database,
    title: "Bancos de Dados e SQL",
    level: "Intermediário",
    lessons: 24,
    hours: 22,
    color: "#5B21B6",
    desc: "Modele, consulte e otimize bancos de dados relacionais com SQL aplicado a casos do dia a dia.",
    modules: ["Modelagem relacional", "Consultas SQL", "Joins e agregações", "Integração com Python"],
  },
  {
    icon: Globe2,
    title: "Desenvolvimento Web",
    level: "Intermediário",
    lessons: 36,
    hours: 40,
    color: "#7C3AED",
    desc: "Construa aplicações web do front-end ao back-end, entendendo como a internet realmente funciona.",
    modules: ["HTML e CSS", "JavaScript moderno", "APIs e back-end", "Projeto full-stack"],
  },
  {
    icon: Cpu,
    title: "Algoritmos e Estruturas",
    level: "Avançado",
    lessons: 30,
    hours: 35,
    color: "#6D28D9",
    desc: "Aprofunde-se em complexidade, recursão e estruturas que separam um bom de um ótimo programador.",
    modules: ["Complexidade Big-O", "Recursão", "Árvores e grafos", "Programação dinâmica"],
  },
  {
    icon: BarChart3,
    title: "Introdução à IA",
    level: "Avançado",
    lessons: 28,
    hours: 38,
    color: "#5B21B6",
    desc: "Entenda os fundamentos de aprendizado de máquina e construa seus primeiros modelos preditivos.",
    modules: ["Estatística aplicada", "Regressão e classificação", "Redes neurais", "Projeto de ML"],
  },
]

const FEATURES = [
  { icon: BookOpen, title: "Conteúdo estruturado", text: "Trilhas com começo, meio e fim, sem você se perder no caminho." },
  { icon: CheckCircle2, title: "Projetos avaliados", text: "Cada módulo termina com um projeto corrigido automaticamente." },
  { icon: Trophy, title: "Certificado gratuito", text: "Conclua uma trilha e receba um certificado verificável da USP." },
]

const LEVEL_BADGE: Record<string, string> = {
  Iniciante: "bg-green-100 text-green-700",
  Intermediário: "bg-amber-100 text-amber-700",
  Avançado: "bg-rose-100 text-rose-700",
}

export default function TrilhasPage() {
  return (
    <>
      <PageHero
        eyebrow="Trilhas de aprendizado"
        icon={<Code2 className="h-4 w-4" />}
        title={
          <>
            Um <span className="gradient-text">currículo completo</span>, do primeiro código à IA
          </>
        }
        description="Trilhas estruturadas que levam você do absoluto zero até habilidades avançadas, sempre com prática real na IDE e projetos avaliados automaticamente."
      />

      {/* Features strip */}
      <section className="pb-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <StaggerItem
                key={f.title}
                className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF]">
                  <f.icon className="h-5 w-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#4C1D95]">{f.title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{f.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Track cards */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TRACKS.map((t) => (
              <StaggerItem
                key={t.title}
                whileHover={{ y: -6 }}
                className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-100"
              >
                <div className="p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <div
                      className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: t.color }}
                    >
                      <t.icon className="h-7 w-7 text-white" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_BADGE[t.level]}`}>
                      {t.level}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#4C1D95]">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.desc}</p>

                  <ul className="mt-5 space-y-2">
                    {t.modules.map((m) => (
                      <li key={m} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7C3AED]" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-7 py-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" /> {t.lessons} lições
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {t.hours}h
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="mt-12 text-center">
            <Link href="/cursos">
              <button className="inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-8 py-4 text-lg font-semibold text-white btn-3d">
                Ver catálogo completo
                <ArrowRight className="h-5 w-5" />
              </button>
            </Link>
          </Reveal>
        </div>
      </section>

      <FinalCta
        title="Escolha sua trilha e comece agora"
        description="Todas as trilhas são gratuitas e você pode começar por onde quiser. Crie sua conta e dê o primeiro passo na sua jornada em tecnologia."
      />
    </>
  )
}
