import { Briefcase, GraduationCap, HeartHandshake, TrendingUp } from "lucide-react"
import type { IconStat } from "./types"

interface RegionShare {
  region: string
  percent: number
}

export const STUDENTS_BY_REGION = [
  { region: "Sudeste", percent: 38 },
  { region: "Nordeste", percent: 27 },
  { region: "Sul", percent: 15 },
  { region: "Norte", percent: 11 },
  { region: "Centro-Oeste", percent: 9 },
] as const satisfies readonly RegionShare[]

export const LEARNING_OUTCOMES = [
  { icon: GraduationCap, value: "72%", label: "concluem a primeira trilha que iniciam" },
  { icon: Briefcase, value: "1.200+", label: "alunos relataram nova vaga ou estágio em tech" },
  { icon: TrendingUp, value: "8 em 10", label: "se sentem mais confiantes para aprender sozinhos" },
  { icon: HeartHandshake, value: "140+", label: "escolas públicas parceiras em todo o país" },
] as const satisfies readonly IconStat[]

interface Testimonial {
  quote: string
  name: string
  role: string
}

/** Todos os depoimentos exibem a nota máxima. */
export const TESTIMONIAL_STAR_COUNT = 5

export const TESTIMONIALS = [
  {
    quote:
      "Eu nunca tinha programado e achava que era coisa de gênio. Em três meses no LevelUSP eu fiz meu primeiro projeto de análise de dados e hoje faço estágio numa startup.",
    name: "Mariana Souza",
    role: "Estudante, Recife — PE",
  },
  {
    quote:
      "Moro numa cidade pequena no interior e não tinha curso de tecnologia perto. A plataforma foi minha porta de entrada para a área. Tudo de graça e em português.",
    name: "João Pedro Lima",
    role: "Estudante, Imperatriz — MA",
  },
  {
    quote:
      "Como professora da rede pública, uso o LevelUSP com minhas turmas. Os alunos se engajam muito mais com a gamificação e a prática na IDE do que com aulas expositivas.",
    name: "Cláudia Ferreira",
    role: "Professora, Goiânia — GO",
  },
] as const satisfies readonly Testimonial[]

interface SustainableDevelopmentGoal {
  number: string
  title: string
  description: string
}

/** Objetivos de Desenvolvimento Sustentável da ONU com que o projeto contribui. */
export const SUSTAINABLE_DEVELOPMENT_GOALS = [
  {
    number: "4",
    title: "Educação de qualidade",
    description: "Acesso gratuito a educação técnica de excelência.",
  },
  {
    number: "8",
    title: "Trabalho decente",
    description: "Qualificação para empregos do futuro digital.",
  },
  {
    number: "10",
    title: "Redução das desigualdades",
    description: "Levando tecnologia a quem tem menos acesso.",
  },
] as const satisfies readonly SustainableDevelopmentGoal[]
