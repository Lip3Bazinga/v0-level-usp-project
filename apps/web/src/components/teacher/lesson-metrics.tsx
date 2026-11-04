import { CheckCircle2, PlayCircle, Send, Target } from "lucide-react"
import type { LessonMetrics } from "@levelusp/contracts"
import { cn, toClampedPercent } from "@/lib/utils"

/** Faixas de aprovação dos envios (0..1): a partir daqui o número fica verde / amarelo. */
const GOOD_PASS_RATE = 0.6
const FAIR_PASS_RATE = 0.3

export interface MetricsSummary {
  started: number
  completed: number
  submissions: number
  /** Aprovação média ponderada pelo número de envios (0..1) ou null sem envios. */
  passRate: number | null
}

export function summarizeMetrics(metricsList: LessonMetrics[]): MetricsSummary {
  let started = 0
  let completed = 0
  let submissions = 0
  let passedSubmissions = 0
  for (const metrics of metricsList) {
    started += metrics.started
    completed += metrics.completed
    submissions += metrics.submissions
    if (metrics.pass_rate !== null) passedSubmissions += metrics.pass_rate * metrics.submissions
  }
  return { started, completed, submissions, passRate: submissions > 0 ? passedSubmissions / submissions : null }
}

export function formatPassRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`
}

function passRateTone(rate: number | null): string {
  if (rate === null) return "text-muted-foreground"
  if (rate >= GOOD_PASS_RATE) return "text-success"
  if (rate >= FAIR_PASS_RATE) return "text-warning"
  return "text-destructive"
}

interface LessonMetricsRowProps {
  metrics: LessonMetrics | undefined
}

/** Linha compacta com as métricas de uma lição no painel do professor. */
export function LessonMetricsRow({ metrics }: LessonMetricsRowProps): React.JSX.Element {
  if (!metrics || (metrics.started === 0 && metrics.submissions === 0)) {
    return <span className="text-xs text-muted-foreground">Sem atividade de alunos ainda</span>
  }
  const completionPercent = toClampedPercent(metrics.completed, metrics.started)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Métricas da lição">
      <span className="inline-flex items-center gap-1" title="Alunos que iniciaram">
        <PlayCircle className="h-3.5 w-3.5 text-level-purple" /> {metrics.started} iniciaram
      </span>
      <span className="inline-flex items-center gap-1" title="Alunos que concluíram">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {metrics.completed} concluíram ({completionPercent}%)
      </span>
      <span className="inline-flex items-center gap-1" title="Envios para correção">
        <Send className="h-3.5 w-3.5" /> {metrics.submissions} envios
      </span>
      <span className={cn("inline-flex items-center gap-1 font-semibold", passRateTone(metrics.pass_rate))} title="Envios aprovados">
        <Target className="h-3.5 w-3.5" /> {formatPassRate(metrics.pass_rate)} de aprovação
      </span>
    </div>
  )
}
