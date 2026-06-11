import type { Metadata } from "next"
import { Lightbulb, ListChecks, Layers, GaugeCircle, ShieldCheck, Infinity as InfinityIcon } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { MethodSection } from "@/components/marketing/method-section"
import { ScienceSection } from "@/components/marketing/science-section"
import { IdeShowcase } from "@/components/marketing/ide-showcase"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, staggerItem, motion } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Metodologia — Como ensinamos no LevelUSP",
  description:
    "Conheça a metodologia do LevelUSP: aprendizagem ativa, prática deliberada numa IDE no navegador e gamificação, tudo fundamentado em ciência cognitiva.",
}

const PILLARS = [
  {
    icon: Lightbulb,
    title: "Aprendizagem ativa",
    text: "O aluno não assiste passivamente: ele constrói, testa hipóteses e resolve problemas desde o início.",
  },
  {
    icon: ListChecks,
    title: "Prática deliberada",
    text: "Exercícios calibrados na zona de desenvolvimento proximal, com feedback imediato e correção automática.",
  },
  {
    icon: Layers,
    title: "Microlições encadeadas",
    text: "Conteúdo dividido em blocos curtos que reduzem a carga cognitiva e mantêm o progresso constante.",
  },
  {
    icon: GaugeCircle,
    title: "Dificuldade adaptativa",
    text: "A trilha ajusta o desafio ao desempenho de cada estudante, evitando tédio e frustração.",
  },
  {
    icon: ShieldCheck,
    title: "Avaliação por evidência",
    text: "Testes unitários ocultos verificam se o código funciona de verdade — não apenas se parece certo.",
  },
  {
    icon: InfinityIcon,
    title: "Revisão espaçada",
    text: "Conceitos retornam em intervalos planejados para consolidar a memória de longo prazo.",
  },
]

const COMPARISON = [
  { label: "Vídeo-aulas passivas", us: "Prática na IDE desde a 1ª lição" },
  { label: "Instalar ambiente complexo", us: "Tudo roda no navegador, sem setup" },
  { label: "Avaliação por múltipla escolha", us: "Código avaliado por testes reais" },
  { label: "Ritmo único para todos", us: "Dificuldade adaptada a você" },
  { label: "Conteúdo genérico importado", us: "Exemplos do contexto brasileiro" },
]

export default function MetodologiaPage() {
  return (
    <>
      <PageHero
        eyebrow="Metodologia"
        icon={<Lightbulb className="h-4 w-4" />}
        title={
          <>
            Aprender programação <span className="gradient-text">fazendo</span>, não decorando
          </>
        }
        description="Nossa abordagem une o que há de mais consolidado na ciência da aprendizagem com uma plataforma gamificada que coloca você escrevendo código real desde o primeiro minuto."
      />

      {/* 6 pillars */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">Os pilares do nosso ensino</h2>
            <p className="mt-4 text-lg text-gray-600">
              Seis princípios pedagógicos que estruturam cada trilha e cada lição da plataforma.
            </p>
          </Reveal>

          <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <motion.div
                key={p.title}
                variants={staggerItem}
                className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                  <p.icon className="h-7 w-7 text-[#7C3AED]" />
                </div>
                <h3 className="text-lg font-semibold text-[#4C1D95]">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-gray-600">{p.text}</p>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Reuse the 3-step method section */}
      <MethodSection />

      {/* IDE showcase */}
      <IdeShowcase />

      {/* Comparison */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[#4C1D95] sm:text-4xl">O que nos torna diferentes</h2>
            <p className="mt-4 text-lg text-gray-600">Por que a experiência LevelUSP funciona melhor.</p>
          </Reveal>

          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-[#E9D5FF]">
              <div className="grid grid-cols-2 bg-[#F3E8FF] text-sm font-semibold">
                <div className="px-6 py-4 text-gray-500">Ensino tradicional</div>
                <div className="px-6 py-4 text-[#4C1D95]">LevelUSP</div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-2 ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}
                >
                  <div className="px-6 py-4 text-sm text-gray-500 line-through decoration-gray-300">
                    {row.label}
                  </div>
                  <div className="px-6 py-4 text-sm font-medium text-[#4C1D95]">{row.us}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Reuse the science / evidence section */}
      <ScienceSection />

      <FinalCta
        title="Veja a metodologia em ação"
        description="A melhor forma de entender nosso método é experimentá-lo. Crie sua conta gratuita e escreva seu primeiro programa em minutos."
      />
    </>
  )
}
