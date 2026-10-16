import { CheckCircle2, PlayCircle, Send, Target } from "lucide-react"
import type { LessonMetrics } from "@levelusp/contracts"
import { cn } from "@/lib/utils"

export interface MetricsSummary {
  started: number
  completed: number
  submissions: number
  /** Aprovação média ponderada pelo número de envios (0..1) ou null sem envios. */
  passRate: number | null
}

export function summarizeMetrics(metrics: LessonMetrics[]): MetricsSummary {
  let started = 0
  let completed = 0
  let submissions = 0
  let passed = 0
  for (const m of metrics) {
    started += m.started
    completed += m.completed
    submissions += m.submissions
    if (m.pass_rate !== null) passed += m.pass_rate * m.submissions
  }
  return { started, completed, submissions, passRate: submissions > 0 ? passed / submissions : null }
}

export function formatPassRate(rate: number | null): string {
  return rate === null ? "—" : `${Math.round(rate * 100)}%`
}

function rateTone(rate: number | null) {
  if (rate === null) return "text-muted-foreground"
  if (rate >= 0.6) return "text-success"
  if (rate >= 0.3) return "text-warning"
  return "text-destructive"
}

/** Linha compacta com as métricas de uma lição no painel do professor. */
export function LessonMetricsRow({ metrics }: { metrics: LessonMetrics | undefined }) {
  if (!metrics || (metrics.started === 0 && metrics.submissions === 0)) {
    return <span className="text-xs text-muted-foreground">Sem atividade de alunos ainda</span>
  }
  const completion = metrics.started > 0 ? Math.round((metrics.completed / metrics.started) * 100) : 0
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Métricas da lição">
      <span className="inline-flex items-center gap-1" title="Alunos que iniciaram">
        <PlayCircle className="h-3.5 w-3.5 text-level-purple" /> {metrics.started} iniciaram
      </span>
      <span className="inline-flex items-center gap-1" title="Alunos que concluíram">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {metrics.completed} concluíram ({completion}%)
      </span>
      <span className="inline-flex items-center gap-1" title="Envios para correção">
        <Send className="h-3.5 w-3.5" /> {metrics.submissions} envios
      </span>
      <span className={cn("inline-flex items-center gap-1 font-semibold", rateTone(metrics.pass_rate))} title="Envios aprovados">
        <Target className="h-3.5 w-3.5" /> {formatPassRate(metrics.pass_rate)} de aprovação
      </span>
    </div>
  )
}
