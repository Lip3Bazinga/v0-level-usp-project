import type { Metadata } from "next"
import { Target, Eye, Heart, Sparkles, Users, BookOpen, Globe, Award } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, staggerItem, motion } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Sobre o LevelUSP — Nossa missão e história",
  description:
    "Conheça a missão, a visão, os valores e a história do LevelUSP, a iniciativa gratuita da Universidade de São Paulo para democratizar o ensino de computação no Brasil.",
}

const VALUES = [
  {
    icon: Globe,
    title: "Acesso universal",
    text: "Educação de qualidade não pode depender de CEP ou renda. Tudo no LevelUSP é e sempre será gratuito.",
  },
  {
    icon: Heart,
    title: "Inclusão real",
    text: "Conteúdo em português, exemplos do cotidiano brasileiro e suporte a quem nunca programou na vida.",
  },
  {
    icon: BookOpen,
    title: "Rigor acadêmico",
    text: "Currículo desenhado por docentes e pesquisadores da USP, com base em evidências da ciência da aprendizagem.",
  },
  {
    icon: Sparkles,
    title: "Aprender fazendo",
    text: "Cada conceito é praticado imediatamente numa IDE real no navegador. Teoria e prática, lado a lado.",
  },
]

const TIMELINE = [
  {
    year: "2022",
    title: "A ideia nasce",
    text: "Um grupo de docentes e estudantes de computação da USP percebe a barreira de acesso ao ensino de programação fora dos grandes centros.",
  },
  {
    year: "2023",
    title: "Primeiro piloto",
    text: "Lançamento de uma trilha experimental de Python para 200 estudantes de escolas públicas parceiras em São Paulo.",
  },
  {
    year: "2024",
    title: "Plataforma gamificada",
    text: "Desenvolvimento da IDE no navegador, do sistema de XP, conquistas e trilhas estruturadas baseadas em prática deliberada.",
  },
  {
    year: "2025",
    title: "Expansão nacional",
    text: "Abertura gratuita para todo o Brasil e novas trilhas de Ciência de Dados, com parcerias em múltiplos estados.",
  },
]

const PRINCIPLES = [
  { icon: Users, stat: "Para todos", label: "iniciantes absolutos são bem-vindos" },
  { icon: Award, stat: "Sem custo", label: "nenhuma mensalidade, hoje ou no futuro" },
  { icon: BookOpen, stat: "Open content", label: "material aberto e revisado por pares" },
]

export default function SobrePage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre o projeto"
        icon={<Sparkles className="h-4 w-4" />}
        title={
          <>
            Tecnologia como ferramenta de <span className="gradient-text">transformação social</span>
          </>
        }
        description="O LevelUSP é uma iniciativa de extensão da Universidade de São Paulo que nasceu para enfrentar uma desigualdade concreta: o acesso ao ensino de computação no Brasil."
      />

      {/* Intro narrative */}
      <section className="pb-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="space-y-6 text-lg leading-relaxed text-gray-700">
              <p>
                Programar deixou de ser uma habilidade de nicho para se tornar uma das competências mais
                determinantes do século XXI. No entanto, no Brasil, esse conhecimento ainda está concentrado
                em poucas instituições, grandes cidades e em quem pode pagar por cursos caros.
              </p>
              <p>
                Acreditamos que a universidade pública tem o dever de devolver à sociedade o conhecimento
                que produz. Por isso, reunimos docentes, pesquisadores e estudantes da USP para construir uma
                plataforma <strong className="text-[#4C1D95]">gratuita, gamificada e cientificamente embasada</strong> —
                capaz de levar a programação a qualquer pessoa, em qualquer lugar do país.
              </p>
            </div>
          </Reveal>

          <Stagger className="mt-10 grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <motion.div
                key={p.label}
                variants={staggerItem}
                className="glass-purple rounded-2xl p-6 text-center"
              >
                <p.icon className="mx-auto mb-3 h-7 w-7 text-[#7C3AED]" />
                <p className="text-xl font-bold text-[#4C1D95]">{p.stat}</p>
                <p className="mt-1 text-sm text-gray-600">{p.label}</p>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl border border-[#E9D5FF] bg-white p-10 shadow-sm">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C3AED]">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#4C1D95]">Nossa missão</h2>
                <p className="mt-4 text-lg leading-relaxed text-gray-700">
                  Democratizar o ensino de computação no Brasil, oferecendo educação gratuita, de alta
                  qualidade e acessível, que transforme a vida de estudantes independentemente de sua origem
                  socioeconômica ou localização.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="h-full rounded-3xl border border-[#E9D5FF] bg-[#4C1D95] p-10 shadow-sm">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <Eye className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Nossa visão</h2>
                <p className="mt-4 text-lg leading-relaxed text-purple-100">
                  Ser a porta de entrada para a tecnologia de milhões de brasileiros, formando uma nova
                  geração de profissionais e cidadãos digitais — e provando que a universidade pública pode
                  educar em escala nacional.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Nossos valores</h2>
            <p className="mt-4 text-lg text-gray-600">
              Princípios que guiam cada decisão que tomamos na construção da plataforma.
            </p>
          </Reveal>

          <Stagger className="grid gap-6 sm:grid-cols-2">
            {VALUES.map((v) => (
              <motion.div
                key={v.title}
                variants={staggerItem}
                className="flex gap-5 rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                  <v.icon className="h-7 w-7 text-[#7C3AED]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#4C1D95]">{v.title}</h3>
                  <p className="mt-2 leading-relaxed text-gray-600">{v.text}</p>
                </div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* History timeline */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Nossa trajetória</h2>
            <p className="mt-4 text-lg text-gray-600">De uma ideia na universidade a uma iniciativa nacional.</p>
          </Reveal>

          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[#E9D5FF] sm:left-1/2 sm:-translate-x-1/2" aria-hidden />
            <div className="space-y-10">
              {TIMELINE.map((item, i) => (
                <Reveal key={item.year} delay={i * 0.05}>
                  <div
                    className={`relative flex items-start gap-6 sm:w-1/2 ${
                      i % 2 === 0 ? "sm:ml-auto sm:flex-row-reverse sm:pl-10" : "sm:pr-10"
                    }`}
                  >
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7C3AED] ring-4 ring-[#F3E8FF]">
                      <span className="h-2 w-2 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                      <span className="text-sm font-bold text-[#7C3AED]">{item.year}</span>
                      <h3 className="mt-1 text-lg font-semibold text-[#4C1D95]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <FinalCta />
    </>
  )
}
