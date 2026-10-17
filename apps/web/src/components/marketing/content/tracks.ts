import type { Difficulty } from "@levelusp/contracts"
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  Globe2,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import type { IconHighlight } from "./types"

interface LearningTrack {
  icon: LucideIcon
  title: string
  level: Difficulty
  lessonCount: number
  hours: number
  /** Cor do ícone da trilha (tons do roxo da marca). */
  accentColor: string
  description: string
  modules: readonly string[]
}

export const LEARNING_TRACKS = [
  {
    icon: Code2,
    title: "Fundamentos de Python",
    level: "iniciante",
    lessonCount: 42,
    hours: 30,
    accentColor: "#7C3AED",
    description:
      "Do zero ao domínio da lógica de programação: variáveis, condicionais, laços, funções e estruturas de dados.",
    modules: [
      "Lógica e variáveis",
      "Estruturas de controle",
      "Funções e módulos",
      "Listas, dicionários e arquivos",
    ],
  },
  {
    icon: BarChart3,
    title: "Ciência de Dados",
    level: "intermediario",
    lessonCount: 38,
    hours: 45,
    accentColor: "#6D28D9",
    description:
      "Manipule, analise e visualize dados reais com Pandas, NumPy e Matplotlib em projetos práticos.",
    modules: [
      "NumPy e arrays",
      "Pandas e DataFrames",
      "Visualização de dados",
      "Projeto: análise real",
    ],
  },
  {
    icon: Database,
    title: "Bancos de Dados e SQL",
    level: "intermediario",
    lessonCount: 24,
    hours: 22,
    accentColor: "#5B21B6",
    description:
      "Modele, consulte e otimize bancos de dados relacionais com SQL aplicado a casos do dia a dia.",
    modules: [
      "Modelagem relacional",
      "Consultas SQL",
      "Joins e agregações",
      "Integração com Python",
    ],
  },
  {
    icon: Globe2,
    title: "Desenvolvimento Web",
    level: "intermediario",
    lessonCount: 36,
    hours: 40,
    accentColor: "#7C3AED",
    description:
      "Construa aplicações web do front-end ao back-end, entendendo como a internet realmente funciona.",
    modules: ["HTML e CSS", "JavaScript moderno", "APIs e back-end", "Projeto full-stack"],
  },
  {
    icon: Cpu,
    title: "Algoritmos e Estruturas",
    level: "avancado",
    lessonCount: 30,
    hours: 35,
    accentColor: "#6D28D9",
    description:
      "Aprofunde-se em complexidade, recursão e estruturas que separam um bom de um ótimo programador.",
    modules: ["Complexidade Big-O", "Recursão", "Árvores e grafos", "Programação dinâmica"],
  },
  {
    icon: BarChart3,
    title: "Introdução à IA",
    level: "avancado",
    lessonCount: 28,
    hours: 38,
    accentColor: "#5B21B6",
    description:
      "Entenda os fundamentos de aprendizado de máquina e construa seus primeiros modelos preditivos.",
    modules: [
      "Estatística aplicada",
      "Regressão e classificação",
      "Redes neurais",
      "Projeto de ML",
    ],
  },
] as const satisfies readonly LearningTrack[]

/**
 * Selo de nível no site público. Os tons (âmbar, rosa) diferem de propósito dos
 * selos de dificuldade da plataforma (`DIFFICULTY_BADGE_CLASSES`).
 */
export const TRACK_LEVEL_BADGE_CLASSES: Record<Difficulty, string> = {
  iniciante: "bg-green-100 text-green-700",
  intermediario: "bg-amber-100 text-amber-700",
  avancado: "bg-rose-100 text-rose-700",
}

export const TRACK_FEATURES = [
  {
    icon: BookOpen,
    title: "Conteúdo estruturado",
    description: "Trilhas com começo, meio e fim, sem você se perder no caminho.",
  },
  {
    icon: CheckCircle2,
    title: "Projetos avaliados",
    description: "Cada módulo termina com um projeto corrigido automaticamente.",
  },
  {
    icon: Trophy,
    title: "Certificado gratuito",
    description: "Conclua uma trilha e receba um certificado verificável da USP.",
  },
] as const satisfies readonly IconHighlight[]
