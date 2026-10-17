import {
  Activity,
  Award,
  BookOpen,
  Brain,
  BrainCircuit,
  Code2,
  Database,
  FlaskConical,
  Globe2,
  HeartHandshake,
  LineChart,
  MapPin,
  Repeat,
  Rocket,
  Sprout,
  Terminal,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"
import { MAIN_FILE_PATH } from "@/lib/constants"
import type { IconHighlight } from "./types"

/** Selos flutuantes ao redor do título da página inicial (só a partir de `md`). */
export const HERO_FLOATING_STATS = [
  { value: "100%", label: "Gratuito", positionClass: "left-2 top-28 sm:left-8 lg:left-16" },
  { value: "+50 XP", label: "por lição", positionClass: "right-2 top-40 sm:right-8 lg:right-20" },
] as const

export const MISSIONS = [
  {
    icon: Globe2,
    title: "Acesso para todo o Brasil",
    description:
      "Levamos educação em computação de qualidade a regiões com poucas oportunidades de formação técnica, sem custo algum.",
  },
  {
    icon: HeartHandshake,
    title: "Inclusão e diversidade",
    description:
      "Reduzimos a barreira de entrada na tecnologia para estudantes de escolas públicas, mulheres e grupos sub-representados.",
  },
  {
    icon: Sprout,
    title: "Impacto socioeconômico",
    description:
      "Formamos talentos que transformam suas comunidades e ampliam a força de trabalho qualificada do país.",
  },
  {
    icon: Users,
    title: "Conhecimento aberto",
    description:
      "Todo o conteúdo é desenvolvido por docentes e pesquisadores da USP e disponibilizado gratuitamente.",
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
      "Testes automáticos avaliam seu código na hora, reforçam o conceito e ajustam a dificuldade ao seu ritmo.",
  },
] as const satisfies readonly IconHighlight[]

interface ScientificEvidence extends IconHighlight {
  stat: string
  source: string
  href: string
}

export const SCIENTIFIC_EVIDENCE = [
  {
    icon: BrainCircuit,
    stat: "+76%",
    title: "Aprendizagem ativa",
    description:
      "Estudantes em aulas com prática ativa têm desempenho significativamente superior ao ensino expositivo tradicional.",
    source: "Freeman et al., PNAS (2014)",
    href: "https://www.pnas.org/doi/10.1073/pnas.1319030111",
  },
  {
    icon: Activity,
    stat: "2x",
    title: "Prática deliberada",
    description:
      "A prática deliberada com feedback imediato é o maior preditor de domínio em habilidades complexas como programar.",
    source: "Ericsson, Psychological Review",
    href: "https://psycnet.apa.org/record/1993-40718-001",
  },
  {
    icon: FlaskConical,
    stat: "+50%",
    title: "Recuperação espaçada",
    description:
      "Testar-se e revisar em intervalos espaçados melhora a retenção de longo prazo comparado a reler conteúdo.",
    source: "Roediger & Karpicke, Science",
    href: "https://www.science.org/doi/10.1126/science.1152408",
  },
] as const satisfies readonly ScientificEvidence[]

interface JourneyChapter extends IconHighlight {
  chapter: string
}

export const JOURNEY_CHAPTERS = [
  {
    icon: Rocket,
    chapter: "Capítulo 1",
    title: "Primeiros passos",
    description: "Lógica, variáveis e seus primeiros programas em Python rodando na IDE.",
  },
  {
    icon: Code2,
    chapter: "Capítulo 2",
    title: "Estruturas e funções",
    description: "Condicionais, laços, funções e organização de código limpo.",
  },
  {
    icon: Database,
    chapter: "Capítulo 3",
    title: "Dados e coleções",
    description: "Listas, dicionários, arquivos e manipulação de dados reais.",
  },
  {
    icon: LineChart,
    chapter: "Capítulo 4",
    title: "Ciência de dados",
    description: "Pandas, NumPy e visualização para extrair valor de dados.",
  },
  {
    icon: Brain,
    chapter: "Capítulo 5",
    title: "Introdução a ML",
    description: "Conceitos de machine learning com projetos guiados e práticos.",
  },
  {
    icon: Trophy,
    chapter: "Conquista",
    title: "Projeto final",
    description: "Construa um projeto completo e receba seu certificado da USP.",
  },
] as const satisfies readonly JourneyChapter[]

export interface CountUpStat {
  icon: LucideIcon
  target: number
  suffix: string
  label: string
}

/** Números que contam de zero até `target` quando a seção entra na tela. */
export const IMPACT_COUNTERS = [
  { icon: Users, target: 50_000, suffix: "+", label: "Estudantes alcançados" },
  { icon: BookOpen, target: 200, suffix: "+", label: "Lições interativas" },
  { icon: MapPin, target: 27, suffix: "", label: "Estados brasileiros" },
  { icon: Award, target: 98, suffix: "%", label: "Satisfação dos alunos" },
] as const satisfies readonly CountUpStat[]

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
