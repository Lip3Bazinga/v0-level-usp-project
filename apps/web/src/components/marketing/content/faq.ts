export interface FaqItem {
  question: string
  answer: string
}

interface FaqGroup {
  title: string
  items: readonly FaqItem[]
}

export const FAQ_GROUPS = [
  {
    title: "Sobre a plataforma",
    items: [
      {
        question: "O LevelUSP é realmente gratuito?",
        answer:
          "Sim, 100%. Todo o conteúdo, a IDE no navegador, os exercícios e os certificados são e sempre serão gratuitos. Somos uma iniciativa de extensão da USP, sem mensalidades ou cobranças escondidas.",
      },
      {
        question: "Preciso instalar algum programa para estudar?",
        answer:
          "Não. Toda a prática acontece numa IDE que roda diretamente no navegador. Você só precisa de um dispositivo com acesso à internet — sem configurar ambiente, sem baixar nada.",
      },
      {
        question: "Funciona no celular?",
        answer:
          "A plataforma é responsiva e você consegue ler as lições e acompanhar seu progresso pelo celular. Para escrever código, recomendamos um computador ou tablet com teclado para uma melhor experiência.",
      },
    ],
  },
  {
    title: "Aprendizado e conteúdo",
    items: [
      {
        question: "Preciso ter conhecimento prévio em programação?",
        answer:
          "Não. Nossas trilhas começam do absoluto zero, assumindo que você nunca escreveu uma linha de código. A dificuldade aumenta de forma gradual e adaptada ao seu ritmo.",
      },
      {
        question: "Quanto tempo leva para concluir uma trilha?",
        answer:
          "Depende do seu ritmo. Cada trilha indica uma carga horária estimada (por exemplo, 30h para Fundamentos de Python). Como o conteúdo é dividido em microlições, você pode estudar alguns minutos por dia.",
      },
      {
        question: "Em que língua está o conteúdo?",
        answer:
          "Todo o conteúdo é em português brasileiro, com exemplos do nosso cotidiano. Acreditamos que aprender na própria língua reduz barreiras e acelera a compreensão.",
      },
    ],
  },
  {
    title: "Certificados e reconhecimento",
    items: [
      {
        question: "Recebo certificado ao concluir uma trilha?",
        answer:
          "Sim. Ao concluir uma trilha completa você recebe um certificado digital verificável emitido pela iniciativa LevelUSP, que pode ser compartilhado no LinkedIn e em currículos.",
      },
      {
        question: "O certificado tem validade no mercado de trabalho?",
        answer:
          "O certificado comprova as competências praticadas na plataforma. Embora não substitua um diploma, ele demonstra dedicação e domínio prático — algo valorizado por recrutadores da área de tecnologia.",
      },
    ],
  },
  {
    title: "Escolas e instituições",
    items: [
      {
        question: "Sou professor(a). Posso usar com minha turma?",
        answer:
          "Com certeza. Muitos educadores usam o LevelUSP em sala de aula. Entre em contato pela página de contato para conhecer o programa de escolas parceiras e acessar relatórios de acompanhamento.",
      },
      {
        question: "Como minha instituição pode se tornar parceira?",
        answer:
          "Visite a página de Parceiros e fale com nossa equipe. Avaliamos parcerias com escolas, universidades, secretarias de educação e empresas que compartilham nossa missão.",
      },
    ],
  },
] as const satisfies readonly FaqGroup[]
