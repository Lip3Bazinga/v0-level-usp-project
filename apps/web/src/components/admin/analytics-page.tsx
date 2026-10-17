"use client"

import { AlertTriangle, Trophy } from "lucide-react"
import type { AnalyticsMetrics } from "@levelusp/contracts"
import { useAsyncResource } from "@/hooks/use-async-resource"
import { fetchAnalyticsMetrics } from "@/lib/api"
import { cn, formatNumber, toClampedPercent } from "@/lib/utils"
import { ChartLegend, Donut, SparkBar } from "./charts"
import { PanelSpinner } from "./panel-spinner"
import { roleSlice } from "./role-chart"

const ACTIVE_USERS_COLOR = "#7C3AED"
const COMPLETIONS_COLOR = "#10B981"
/** Abaixo disso o rótulo não cabe dentro da barra do funil. */
const MIN_PERCENT_FOR_INNER_LABEL = 10
const MIN_FUNNEL_BAR_PERCENT = 2

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/** DAU/MAU com uma casa decimal (ponto como separador, como sempre foi exibido). */
function formatStickiness({ dau, mau }: Pick<AnalyticsMetrics, "dau" | "mau">): string {
  return mau > 0 ? `${((dau / mau) * 100).toFixed(1)}%` : "—%"
}

interface FunnelStep {
  label: string
  value: number
  percent: number
}

function buildFunnel(metrics: AnalyticsMetrics): FunnelStep[] {
  const { totalUsers } = metrics
  return [
    { label: "Usuários cadastrados", value: totalUsers, percent: 100 },
    { label: "Concluiu a 1ª lição", value: metrics.funnelStarted, percent: toClampedPercent(metrics.funnelStarted, totalUsers) },
    { label: "Concluiu 5+ lições", value: metrics.funnelCompleted5, percent: toClampedPercent(metrics.funnelCompleted5, totalUsers) },
    { label: "Sequência de 7+ dias", value: metrics.funnelStreak7, percent: toClampedPercent(metrics.funnelStreak7, totalUsers) },
  ]
}

interface EngagementKpi {
  label: string
  value: string
  caption: string
  colorClass: string
}

function buildKpis(metrics: AnalyticsMetrics): EngagementKpi[] {
  return [
    { label: "DAU", value: formatNumber(metrics.dau), caption: "ativos nas últimas 24 h", colorClass: "text-level-purple" },
    { label: "WAU", value: formatNumber(metrics.wau), caption: "ativos nos últimos 7 dias", colorClass: "text-level-purple-medium" },
    { label: "MAU", value: formatNumber(metrics.mau), caption: "ativos nos últimos 30 dias", colorClass: "text-level-purple-dark" },
    { label: "DAU/MAU", value: formatStickiness(metrics), caption: "stickiness", colorClass: "text-warning" },
    { label: "Retenção 7d", value: `${metrics.retention7d}%`, caption: "contas com 7+ dias ativas na semana", colorClass: "text-success" },
    { label: "XP médio", value: formatNumber(metrics.averageXp), caption: "por aluno", colorClass: "text-info" },
  ]
}

export function AnalyticsPage() {
  const analytics = useAsyncResource(() => fetchAnalyticsMetrics(), [], {
    errorMessage: "Não foi possível carregar as métricas.",
  })

  if (analytics.status === "loading") return <PanelSpinner />

  if (analytics.status === "error") {
    return (
      <div className="p-6">
        <div role="alert" className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {analytics.error}
        </div>
      </div>
    )
  }

  const metrics = analytics.data
  const roleSlices = metrics.roleDistribution.map(({ role, count }) => roleSlice(role, count))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-extrabold text-level-purple-dark">Analytics</h2>
        <p className="text-sm text-muted-foreground">Métricas de engajamento e aprendizado (fuso de São Paulo)</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {buildKpis(metrics).map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            <p className={cn("mt-1 text-3xl font-extrabold", kpi.colorClass)}>{kpi.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{kpi.caption}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyChart
          title="Usuários ativos por dia"
          subtitle="Alunos distintos que concluíram alguma lição"
          data={metrics.dailyActiveUsers}
          color={ACTIVE_USERS_COLOR}
        />
        <DailyChart title="Conclusões por dia" subtitle="Lições concluídas" data={metrics.completionsByDay} color={COMPLETIONS_COLOR} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-extrabold text-level-purple-dark">Funil de aprendizado</p>
          <div className="space-y-2">
            {buildFunnel(metrics).map((step) => (
              <FunnelBar key={step.label} step={step} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="mb-3 text-sm font-extrabold text-level-purple-dark">Distribuição por papel</p>
          <div className="flex items-center justify-between gap-4">
            <Donut data={roleSlices} size={120} thickness={14} label="usuários" />
            <ChartLegend slices={roleSlices} />
          </div>
        </div>
      </div>

      <TopLessons lessons={metrics.topLessons} />
    </div>
  )
}

interface DailyChartProps {
  title: string
  subtitle: string
  data: number[]
  color: string
}

function DailyChart({ title, subtitle, data, color }: DailyChartProps) {
  const peak = Math.max(0, ...data)
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-level-purple-dark">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-level-purple-dark">{formatNumber(sum(data))}</p>
          <p className="text-[10px] text-muted-foreground">pico {peak}/dia</p>
        </div>
      </div>
      <SparkBar data={data.length ? data : [0]} color={color} height={90} width={7} gap={3} />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{data.length} dias atrás</span>
        <span>hoje</span>
      </div>
    </div>
  )
}

interface FunnelBarProps {
  step: FunnelStep
}

function FunnelBar({ step }: FunnelBarProps) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{step.label}</span>
        <span className="text-xs font-bold text-level-purple-dark">
          {formatNumber(step.value)} <span className="font-semibold text-muted-foreground">· {step.percent}%</span>
        </span>
      </div>
      <div className="h-7 overflow-hidden rounded-lg bg-level-purple-subtle/50">
        <div
          className="flex h-full items-center rounded-lg bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium px-2"
          style={{ width: `${Math.max(step.percent, MIN_FUNNEL_BAR_PERCENT)}%` }}
        >
          {step.percent > MIN_PERCENT_FOR_INNER_LABEL && <span className="text-[10px] font-bold text-white">{step.percent}%</span>}
        </div>
      </div>
    </div>
  )
}

interface TopLessonsProps {
  lessons: AnalyticsMetrics["topLessons"]
}

function TopLessons({ lessons }: TopLessonsProps) {
  const maxCompletions = Math.max(1, ...lessons.map((lesson) => lesson.completions))
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-level-purple-dark">
        <Trophy className="h-4 w-4 text-warning" /> Lições mais concluídas
      </p>
      {lessons.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma conclusão registrada ainda.</p>
      ) : (
        <ol className="space-y-2">
          {lessons.map((lesson, position) => (
            <li key={lesson.lesson_id} className="flex items-center gap-3">
              <span className="w-5 text-right font-mono text-xs text-muted-foreground">{position + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">{lesson.title}</span>
                  <span className="text-xs font-bold text-level-purple-dark">{formatNumber(lesson.completions)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-level-purple-subtle">
                  <div className="h-full rounded-full bg-level-purple" style={{ width: `${(lesson.completions / maxCompletions) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
