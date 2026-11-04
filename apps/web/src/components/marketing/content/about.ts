import { Award, BookOpen, Globe, Heart, Sparkles, Users } from "lucide-react"
import type { IconHighlight, IconStat } from "./types"

export const ABOUT_VALUES = [
  {
    icon: Globe,
    title: "Acesso universal",
    description:
      "Educação de qualidade não pode depender de CEP ou renda. Tudo no LevelUSP é e sempre será gratuito.",
  },
  {
    icon: Heart,
    title: "Inclusão real",
    description:
      "Conteúdo em português, exemplos do cotidiano brasileiro e suporte a quem nunca programou na vida.",
  },
  {
    icon: BookOpen,
    title: "Rigor acadêmico",
    description:
      "Currículo desenhado por docentes e pesquisadores da USP, com base em evidências da ciência da aprendizagem.",
  },
  {
    icon: Sparkles,
    title: "Aprender fazendo",
    description:
      "Cada conceito é praticado imediatamente numa IDE real no navegador. Teoria e prática, lado a lado.",
  },
] as const satisfies readonly IconHighlight[]

interface TimelineEvent {
  year: string
  title: string
  description: string
}

export const ABOUT_TIMELINE = [
  {
    year: "2022",
    title: "A ideia nasce",
    description:
      "Um grupo de docentes e estudantes de computação da USP percebe a barreira de acesso ao ensino de programação fora dos grandes centros.",
  },
  {
    year: "2023",
    title: "Primeiro piloto",
    description:
      "Lançamento de uma trilha experimental de Python para 200 estudantes de escolas públicas parceiras em São Paulo.",
  },
  {
    year: "2024",
    title: "Plataforma gamificada",
    description:
      "Desenvolvimento da IDE no navegador, do sistema de XP, conquistas e trilhas estruturadas baseadas em prática deliberada.",
  },
  {
    year: "2025",
    title: "Expansão nacional",
    description:
      "Abertura gratuita para todo o Brasil e novas trilhas de Ciência de Dados, com parcerias em múltiplos estados.",
  },
] as const satisfies readonly TimelineEvent[]

export const ABOUT_PRINCIPLES = [
  { icon: Users, value: "Para todos", label: "iniciantes absolutos são bem-vindos" },
  { icon: Award, value: "Sem custo", label: "nenhuma mensalidade, hoje ou no futuro" },
  { icon: BookOpen, value: "Open content", label: "material aberto e revisado por pares" },
] as const satisfies readonly IconStat[]
