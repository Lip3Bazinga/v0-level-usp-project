import {
  GaugeCircle,
  Infinity as InfinityIcon,
  Layers,
  Lightbulb,
  ListChecks,
  ShieldCheck,
} from "lucide-react"
import type { IconHighlight } from "./types"

export const TEACHING_PILLARS = [
  {
    icon: Lightbulb,
    title: "Aprendizagem ativa",
    description:
      "O aluno não assiste passivamente: ele constrói, testa hipóteses e resolve problemas desde o início.",
  },
  {
    icon: ListChecks,
    title: "Prática deliberada",
    description:
      "Exercícios calibrados na zona de desenvolvimento proximal, com feedback imediato e correção automática.",
  },
  {
    icon: Layers,
    title: "Microlições encadeadas",
    description:
      "Conteúdo dividido em blocos curtos que reduzem a carga cognitiva e mantêm o progresso constante.",
  },
  {
    icon: GaugeCircle,
    title: "Dificuldade adaptativa",
    description:
      "A trilha ajusta o desafio ao desempenho de cada estudante, evitando tédio e frustração.",
  },
  {
    icon: ShieldCheck,
    title: "Avaliação por evidência",
    description:
      "Testes unitários ocultos verificam se o código funciona de verdade — não apenas se parece certo.",
  },
  {
    icon: InfinityIcon,
    title: "Revisão espaçada",
    description:
      "Conceitos retornam em intervalos planejados para consolidar a memória de longo prazo.",
  },
] as const satisfies readonly IconHighlight[]

interface MethodComparison {
  traditional: string
  levelUsp: string
}

export const METHOD_COMPARISON = [
  { traditional: "Vídeo-aulas passivas", levelUsp: "Prática na IDE desde a 1ª lição" },
  { traditional: "Instalar ambiente complexo", levelUsp: "Tudo roda no navegador, sem setup" },
  { traditional: "Avaliação por múltipla escolha", levelUsp: "Código avaliado por testes reais" },
  { traditional: "Ritmo único para todos", levelUsp: "Dificuldade adaptada a você" },
  { traditional: "Conteúdo genérico importado", levelUsp: "Exemplos do contexto brasileiro" },
] as const satisfies readonly MethodComparison[]
