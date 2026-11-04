import { Building2, Code2, Heart, School } from "lucide-react"
import type { IconHighlight } from "./types"

export const PARTNER_CATEGORIES = [
  {
    icon: Building2,
    title: "Apoio institucional",
    description:
      "Universidades e órgãos públicos que sustentam a infraestrutura e a credibilidade acadêmica do projeto.",
  },
  {
    icon: School,
    title: "Rede de escolas",
    description:
      "Escolas públicas e privadas que adotam a plataforma com seus estudantes em sala de aula.",
  },
  {
    icon: Code2,
    title: "Parceiros de tecnologia",
    description:
      "Empresas que doam créditos de nuvem, ferramentas e mentoria técnica para a equipe.",
  },
  {
    icon: Heart,
    title: "Patrocínio social",
    description:
      "Organizações e doadores que financiam bolsas, eventos e a expansão para novas regiões.",
  },
] as const satisfies readonly IconHighlight[]

/** Nomes ilustrativos, exibidos como texto: não usamos logotipos de marcas reais. */
export const PARTNER_NAMES = [
  "Universidade de São Paulo",
  "Instituto de Computação",
  "Secretaria de Educação",
  "Fundação de Pesquisa",
  "Hub de Inovação",
  "Rede Pública de Ensino",
  "Centro de Tecnologia",
  "Programa de Extensão",
] as const

export const PARTNERSHIP_BENEFITS = [
  "Acesso a relatórios de impacto e engajamento das suas turmas",
  "Material didático aberto e suporte pedagógico da equipe USP",
  "Co-criação de trilhas voltadas à sua comunidade",
  "Visibilidade como apoiador da democratização da tecnologia",
] as const
