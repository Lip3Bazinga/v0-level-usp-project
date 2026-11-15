import {
  Eye,
  LifeBuoy,
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
      "Exercícios curtos, em ordem crescente de dificuldade, com feedback imediato e correção automática.",
  },
  {
    icon: Layers,
    title: "Microlições encadeadas",
    description:
      "Conteúdo dividido em blocos curtos que reduzem a carga cognitiva e mantêm o progresso constante.",
  },
  {
    icon: LifeBuoy,
    title: "Dicas e solução comentada",
    description:
      "Quem trava pede dicas, uma a uma; depois de algumas tentativas, a solução comentada fica disponível.",
  },
  {
    icon: ShieldCheck,
    title: "Avaliação por evidência",
    description:
      "Testes unitários ocultos verificam se o código funciona de verdade — não apenas se parece certo.",
  },
  {
    icon: Eye,
    title: "Prever antes de executar",
    description:
      "Passos de previsão pedem que você diga o que o código imprime antes de rodá-lo.",
  },
] as const satisfies readonly IconHighlight[]

interface MethodComparison {
  /** Como costuma ser num curso em vídeo ou em sala. */
  traditional: string
  levelUsp: string
}

export const METHOD_COMPARISON = [
  { traditional: "Vídeo-aulas passivas", levelUsp: "Prática na IDE desde a 1ª lição" },
  { traditional: "Instalar ambiente complexo", levelUsp: "Tudo roda no navegador, sem setup" },
  { traditional: "Exercício sem correção", levelUsp: "Código avaliado por testes automáticos" },
  { traditional: "Ritmo da turma", levelUsp: "Você avança no seu ritmo, passo a passo" },
  { traditional: "Material em inglês", levelUsp: "Conteúdo em português, com exemplos do cotidiano" },
] as const satisfies readonly MethodComparison[]
