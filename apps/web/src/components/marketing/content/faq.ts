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
          "Sim. O conteúdo, a IDE no navegador, os exercícios e os certificados são gratuitos, sem mensalidade. O LevelUSP é um trabalho de conclusão de curso desenvolvido no DCM/FFCLRP-USP.",
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
          "Não. A trilha começa do zero, para quem nunca escreveu uma linha de código, e a dificuldade aumenta aos poucos, de um nível para o outro.",
      },
      {
        question: "O que já está disponível?",
        answer:
          "A trilha tem 7 níveis, do zero à IA. Hoje o Nível 1 (Fundamentos) está disponível; os demais estão em preparação. Cada curso mostra a carga horária estimada na própria página e é dividido em lições curtas.",
      },
      {
        question: "Como funciona o XP?",
        answer:
          "O XP varia por passo: cada passo de uma lição (leitura, exercício, previsão ou quiz) vale uma quantidade própria, creditada quando você o conclui. O total de uma lição é a soma dos seus passos.",
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
        question: "Recebo certificado ao concluir um curso?",
        answer:
          "Sim. Ao concluir as lições, o projeto e a prova de um nível, você recebe um certificado digital com código de verificação. É um certificado emitido pela plataforma LevelUSP, projeto de TCC desenvolvido no DCM/FFCLRP-USP; não é um documento emitido nem reconhecido pela USP.",
      },
      {
        question: "O certificado tem validade no mercado de trabalho?",
        answer:
          "O certificado registra que você concluiu as lições, o projeto e a prova do curso na plataforma. Ele não é um diploma nem um certificado oficial da USP.",
      },
    ],
  },
  {
    title: "Professores",
    items: [
      {
        question: "Sou professor(a). Posso usar com minha turma?",
        answer:
          "Pode. A plataforma é gratuita e seus alunos podem criar conta e estudar por conta própria. Não há um programa de escolas nem relatórios por turma.",
      },
    ],
  },
] as const satisfies readonly FaqGroup[]
