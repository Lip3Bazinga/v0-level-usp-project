import { Award, BookOpen, Globe, Heart, Sparkles, Users } from "lucide-react"
import type { IconHighlight, IconStat } from "./types"

export const ABOUT_VALUES = [
  {
    icon: Globe,
    title: "Acesso universal",
    description:
      "Educação de qualidade não pode depender de CEP ou renda. O LevelUSP é gratuito.",
  },
  {
    icon: Heart,
    title: "Inclusão real",
    description:
      "Conteúdo em português, exemplos do cotidiano brasileiro e suporte a quem nunca programou na vida.",
  },
  {
    icon: BookOpen,
    title: "Origem acadêmica",
    description:
      "Projeto desenvolvido no DCM/FFCLRP-USP como trabalho de conclusão de curso, com orientação docente.",
  },
  {
    icon: Sparkles,
    title: "Aprender fazendo",
    description:
      "Cada conceito é praticado imediatamente numa IDE real no navegador. Teoria e prática, lado a lado.",
  },
] as const satisfies readonly IconHighlight[]

/** Origem do projeto: o único fato da história do LevelUSP até aqui. */
export const ABOUT_ORIGIN = {
  title: "Trabalho de conclusão de curso",
  description:
    "O LevelUSP é desenvolvido como trabalho de conclusão de curso no Departamento de Computação e Matemática da FFCLRP-USP (DCM/FFCLRP-USP), em Ribeirão Preto.",
} as const

export const ABOUT_PRINCIPLES = [
  { icon: Users, value: "Para todos", label: "iniciantes absolutos são bem-vindos" },
  { icon: Award, value: "Sem custo", label: "nenhuma mensalidade" },
  { icon: BookOpen, value: "Em português", label: "conteúdo e mensagens de erro em pt-BR" },
] as const satisfies readonly IconStat[]
