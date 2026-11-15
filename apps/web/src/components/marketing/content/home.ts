import {
  Activity,
  BookOpen,
  Brain,
  BrainCircuit,
  Code2,
  Database,
  FlaskConical,
  Globe2,
  HeartHandshake,
  LineChart,
  Repeat,
  Rocket,
  Sprout,
  Terminal,
  Trophy,
  Users,
} from "lucide-react"
import { MAIN_FILE_PATH } from "@/lib/constants"
import type { IconHighlight } from "./types"

/** Selos flutuantes ao redor do título da página inicial (só a partir de `md`). */
export const HERO_FLOATING_STATS = [
  { value: "Gratuito", label: "sem mensalidade", positionClass: "left-2 top-28 sm:left-8 lg:left-16" },
  { value: "XP", label: "a cada passo concluído", positionClass: "right-2 top-40 sm:right-8 lg:right-20" },
] as const

export const MISSIONS = [
  {
    icon: Globe2,
    title: "Acesso sem custo",
    description:
      "Qualquer pessoa com um navegador e internet pode estudar: não há mensalidade nem programa para instalar.",
  },
  {
    icon: HeartHandshake,
    title: "Do zero, em português",
    description:
      "O conteúdo parte de quem nunca programou, em português brasileiro e com exemplos do cotidiano.",
  },
  {
    icon: Sprout,
    title: "Prática desde o início",
    description:
      "Cada lição é dividida em passos curtos, com exercícios corrigidos automaticamente e um projeto ao fim do nível.",
  },
  {
    icon: Users,
    title: "Projeto acadêmico",
    description:
      "O LevelUSP é um trabalho de conclusão de curso desenvolvido no DCM/FFCLRP-USP, com o código no GitHub.",
  },
] as const satisfies readonly IconHighlight[]

export const METHOD_STEPS = [
  {
    icon: BookOpen,
    title: "Teoria contextualizada",
    description:
      "Conceitos apresentados em pequenos blocos, com exemplos do mundo real e linguagem acessível — sem pré-requisitos.",
  },
  {
    icon: Terminal,
    title: "Prática imediata na IDE",
    description:
      "Você escreve e executa código real numa IDE no navegador, sem instalar nada. O aprendizado acontece fazendo.",
  },
  {
    icon: Repeat,
    title: "Feedback e repetição",
    description:
      "Testes automáticos avaliam seu código na hora; dicas e a solução comentada ajudam quando você trava.",
  },
] as const satisfies readonly IconHighlight[]

interface ScientificEvidence extends IconHighlight {
  source: string
  href: string
}

export const SCIENTIFIC_EVIDENCE = [
  {
    icon: BrainCircuit,
    title: "Aprendizagem ativa",
    description:
      "Estudantes em aulas com prática ativa têm desempenho significativamente superior ao ensino expositivo tradicional.",
    source: "Freeman et al., PNAS (2014)",
    href: "https://www.pnas.org/doi/10.1073/pnas.1319030111",
  },
  {
    icon: Activity,
    title: "Prática deliberada",
    description:
      "O estudo descreve a prática deliberada, com feedback imediato, como caminho para o desempenho de especialista.",
    source: "Ericsson et al., Psychological Review (1993)",
    href: "https://psycnet.apa.org/record/1993-40718-001",
  },
  {
    icon: FlaskConical,
    title: "Prática de recuperação",
    description:
      "Tentar lembrar do conteúdo, como nos quizzes e nos passos de previsão, melhora a retenção em comparação com reler.",
    source: "Karpicke & Roediger, Science (2008)",
    href: "https://www.science.org/doi/10.1126/science.1152408",
  },
] as const satisfies readonly ScientificEvidence[]

interface JourneyChapter extends IconHighlight {
  chapter: string
}

/** Os 7 níveis da trilha, como estão no currículo. Só o Nível 1 está publicado. */
export const JOURNEY_CHAPTERS = [
  {
    icon: Rocket,
    chapter: "Nível 1 · disponível",
    title: "Fundamentos",
    description: "Fundamentos de programação e de computação: variáveis, decisões, laços, funções e coleções.",
  },
  {
    icon: Code2,
    chapter: "Nível 2 · em preparação",
    title: "Python intermediário",
    description: "Python intermediário e engenharia de software.",
  },
  {
    icon: Database,
    chapter: "Nível 3 · em preparação",
    title: "Estruturas de dados e algoritmos",
    description: "Como organizar dados e medir o custo de um algoritmo.",
  },
  {
    icon: LineChart,
    chapter: "Nível 4 · em preparação",
    title: "Análise de dados",
    description: "Tabelas, gráficos e análise de dados com Python.",
  },
  {
    icon: Brain,
    chapter: "Níveis 5 e 6 · em preparação",
    title: "Machine Learning e Deep Learning",
    description: "Dos modelos clássicos às redes neurais.",
  },
  {
    icon: Trophy,
    chapter: "Nível 7 · em preparação",
    title: "Engenharia de IA",
    description: "O último nível da trilha. Cada nível termina com projeto, prova e certificado.",
  },
] as const satisfies readonly JourneyChapter[]

/** Classe de destaque de sintaxe (cores do tema escuro do VS Code). */
export type CodeTokenKind =
  "keyword" | "function" | "punctuation" | "comment" | "variable" | "number" | "string"

/** Texto sem destaque (espaços) ou um trecho colorido `[tipo, texto]`. */
export type CodeToken = string | readonly [CodeTokenKind, string]

export interface CodeLine {
  isIndented?: boolean
  tokens: readonly CodeToken[]
}

export const IDE_SAMPLE_FILE_NAME = MAIN_FILE_PATH
export const IDE_SAMPLE_PROJECT_FILES = [IDE_SAMPLE_FILE_NAME, "data.csv", "utils.py"] as const
export const IDE_SAMPLE_OUTPUT = "Sua média é: 8.75"

export const IDE_SAMPLE_CODE: readonly CodeLine[] = [
  {
    tokens: [["keyword", "def"], " ", ["function", "calcular_media"], ["punctuation", "(notas):"]],
  },
  { isIndented: true, tokens: [["comment", "# Calcula a média das notas"]] },
  {
    isIndented: true,
    tokens: [
      ["keyword", "return"],
      " ",
      ["function", "sum"],
      ["punctuation", "(notas) / "],
      ["function", "len"],
      ["punctuation", "(notas)"],
    ],
  },
  { tokens: [] },
  {
    tokens: [
      ["variable", "notas"],
      " ",
      ["punctuation", "= ["],
      ["number", "8.5"],
      ["punctuation", ", "],
      ["number", "9.0"],
      ["punctuation", ", "],
      ["number", "7.5"],
      ["punctuation", ", "],
      ["number", "10.0"],
      ["punctuation", "]"],
    ],
  },
  {
    tokens: [
      ["variable", "media"],
      " ",
      ["punctuation", "= "],
      ["function", "calcular_media"],
      ["punctuation", "(notas)"],
    ],
  },
  {
    tokens: [
      ["function", "print"],
      ["punctuation", "("],
      ["string", 'f"Sua média é: '],
      ["variable", "{media}"],
      ["string", '"'],
      ["punctuation", ")"],
    ],
  },
]
