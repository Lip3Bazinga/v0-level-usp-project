import type { Metadata } from "next"
import Link from "next/link"
import { HelpCircle, MessageCircle } from "lucide-react"
import { PageHero } from "@/components/marketing/page-hero"
import { FaqAccordion } from "@/components/marketing/faq-accordion"
import { Reveal } from "@/components/marketing/motion-primitives"

export const metadata: Metadata = {
  title: "Perguntas frequentes — LevelUSP",
  description:
    "Tire suas dúvidas sobre o LevelUSP: gratuidade, pré-requisitos, certificados, funcionamento da IDE no navegador e muito mais.",
}

const GROUPS = [
  {
    title: "Sobre a plataforma",
    items: [
      {
        q: "O LevelUSP é realmente gratuito?",
        a: "Sim, 100%. Todo o conteúdo, a IDE no navegador, os exercícios e os certificados são e sempre serão gratuitos. Somos uma iniciativa de extensão da USP, sem mensalidades ou cobranças escondidas.",
      },
      {
        q: "Preciso instalar algum programa para estudar?",
        a: "Não. Toda a prática acontece numa IDE que roda diretamente no navegador. Você só precisa de um dispositivo com acesso à internet — sem configurar ambiente, sem baixar nada.",
      },
      {
        q: "Funciona no celular?",
        a: "A plataforma é responsiva e você consegue ler as lições e acompanhar seu progresso pelo celular. Para escrever código, recomendamos um computador ou tablet com teclado para uma melhor experiência.",
      },
    ],
  },
  {
    title: "Aprendizado e conteúdo",
    items: [
      {
        q: "Preciso ter conhecimento prévio em programação?",
        a: "Não. Nossas trilhas começam do absoluto zero, assumindo que você nunca escreveu uma linha de código. A dificuldade aumenta de forma gradual e adaptada ao seu ritmo.",
      },
      {
        q: "Quanto tempo leva para concluir uma trilha?",
        a: "Depende do seu ritmo. Cada trilha indica uma carga horária estimada (por exemplo, 30h para Fundamentos de Python). Como o conteúdo é dividido em microlições, você pode estudar alguns minutos por dia.",
      },
      {
        q: "Em que língua está o conteúdo?",
        a: "Todo o conteúdo é em português brasileiro, com exemplos do nosso cotidiano. Acreditamos que aprender na própria língua reduz barreiras e acelera a compreensão.",
      },
    ],
  },
  {
    title: "Certificados e reconhecimento",
    items: [
      {
        q: "Recebo certificado ao concluir uma trilha?",
        a: "Sim. Ao concluir uma trilha completa você recebe um certificado digital verificável emitido pela iniciativa LevelUSP, que pode ser compartilhado no LinkedIn e em currículos.",
      },
      {
        q: "O certificado tem validade no mercado de trabalho?",
        a: "O certificado comprova as competências praticadas na plataforma. Embora não substitua um diploma, ele demonstra dedicação e domínio prático — algo valorizado por recrutadores da área de tecnologia.",
      },
    ],
  },
  {
    title: "Escolas e instituições",
    items: [
      {
        q: "Sou professor(a). Posso usar com minha turma?",
        a: "Com certeza. Muitos educadores usam o LevelUSP em sala de aula. Entre em contato pela página de contato para conhecer o programa de escolas parceiras e acessar relatórios de acompanhamento.",
      },
      {
        q: "Como minha instituição pode se tornar parceira?",
        a: "Visite a página de Parceiros e fale com nossa equipe. Avaliamos parcerias com escolas, universidades, secretarias de educação e empresas que compartilham nossa missão.",
      },
    ],
  },
]

export default function FaqPage() {
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
          {GROUPS.map((group) => (
            <Reveal key={group.title}>
              <h2 className="mb-5 text-xl font-bold text-[#4C1D95]">{group.title}</h2>
              <FaqAccordion items={group.items} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="glass-purple flex flex-col items-center rounded-3xl p-10 text-center">
              <MessageCircle className="mb-4 h-10 w-10 text-[#7C3AED]" />
              <h2 className="text-2xl font-bold text-[#4C1D95]">Ainda tem dúvidas?</h2>
              <p className="mt-3 max-w-md text-gray-600">
                Nossa equipe está pronta para ajudar. Envie sua mensagem e responderemos o quanto antes.
              </p>
              <Link href="/contato" className="mt-6">
                <button className="rounded-2xl bg-[#7C3AED] px-8 py-4 font-semibold text-white btn-3d">
                  Falar com a equipe
                </button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
