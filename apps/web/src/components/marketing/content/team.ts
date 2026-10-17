import { BookOpen, Code2, HeartHandshake, Palette } from "lucide-react"
import type { IconHighlight } from "./types"

interface TeamMember {
  name: string
  role: string
  initials: string
}

interface AcademicLead extends TeamMember {
  area: string
}

export const ACADEMIC_LEADS = [
  {
    name: "Dra. Helena Martins",
    role: "Coordenação acadêmica",
    area: "Docente — Ciência da Computação",
    initials: "HM",
  },
  {
    name: "Prof. Ricardo Alves",
    role: "Direção pedagógica",
    area: "Docente — Educação e Tecnologia",
    initials: "RA",
  },
  {
    name: "Dra. Beatriz Nunes",
    role: "Pesquisa e currículo",
    area: "Pesquisadora — Ciência da Aprendizagem",
    initials: "BN",
  },
] as const satisfies readonly AcademicLead[]

export const CORE_TEAM = [
  { name: "Lucas Pereira", role: "Engenharia de Software", initials: "LP" },
  { name: "Ana Carolina Dias", role: "Design de Produto", initials: "AD" },
  { name: "Felipe Santos", role: "Conteúdo e Currículo", initials: "FS" },
  { name: "Juliana Rocha", role: "Engenharia de Software", initials: "JR" },
  { name: "Marcos Vinícius", role: "Infraestrutura", initials: "MV" },
  { name: "Patrícia Gomes", role: "Experiência do Aluno", initials: "PG" },
  { name: "Rafael Costa", role: "Ciência de Dados", initials: "RC" },
  { name: "Camila Ribeiro", role: "Comunidade", initials: "CR" },
] as const satisfies readonly TeamMember[]

export const TEAM_SQUADS = [
  {
    icon: Code2,
    title: "Engenharia",
    description: "Constrói a plataforma, a IDE no navegador e o avaliador de código.",
  },
  {
    icon: BookOpen,
    title: "Pedagogia",
    description: "Desenha trilhas, lições e exercícios com base em evidências.",
  },
  {
    icon: Palette,
    title: "Design",
    description: "Cuida da experiência gamificada e da acessibilidade de tudo.",
  },
  {
    icon: HeartHandshake,
    title: "Comunidade",
    description: "Apoia alunos, escolas parceiras e a rede de voluntários.",
  },
] as const satisfies readonly IconHighlight[]
