"use client"

import { Activity, BookOpen, CheckCircle2, GraduationCap, TrendingUp, Users, type LucideIcon } from "lucide-react"
import type { PlatformMetrics, RecentActivity } from "@levelusp/contracts"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn, formatNumber, formatTimeAgo, getInitials } from "@/lib/utils"
import type { AdminPageId } from "./admin-pages"
import { ChartLegend, Donut, SparkBar } from "./charts"
import { roleSlice } from "./role-chart"

const DOTTED_BACKGROUND = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
  backgroundSize: "18px 18px",
}

/** "1 curso", "2 cursos": contagem com a forma certa do substantivo. */
function pluralize(count: number, singular: string, plural: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

interface Kpi {
  label: string
  value: string
  icon: LucideIcon
  colorClass: string
}

function buildKpis(metrics: PlatformMetrics): Kpi[] {
  return [
    { label: "Usuários", value: formatNumber(metrics.totalUsers), icon: Users, colorClass: "bg-level-purple-light text-level-purple" },
    { label: "Conclusões", value: formatNumber(metrics.totalCompletions), icon: Activity, colorClass: "bg-success/10 text-success" },
    { label: "Matrículas", value: formatNumber(metrics.totalEnrollments), icon: GraduationCap, colorClass: "bg-info/10 text-info" },
    { label: "XP Distribuído", value: formatNumber(metrics.totalXpAwarded), icon: TrendingUp, colorClass: "bg-warning/10 text-warning" },
    {
      label: "Cursos Publicados",
      value: `${metrics.publishedCourses}/${metrics.totalCourses}`,
      icon: BookOpen,
      colorClass: "bg-level-purple-light text-level-purple",
    },
    {
      label: "Lições Publicadas",
      value: `${metrics.publishedLessons}/${metrics.totalLessons}`,
      icon: CheckCircle2,
      colorClass: "bg-success/10 text-success",
    },
  ]
}

interface AdminOverviewProps {
  metrics: PlatformMetrics
  activity: RecentActivity[]
  dailyCompletions: number[]
  onNavigate: (page: AdminPageId) => void
}

export function AdminOverview({ metrics, activity, dailyCompletions, onNavigate }: AdminOverviewProps): React.JSX.Element {
  const roleSlices = [
    roleSlice("student", metrics.totalStudents),
    roleSlice("teacher", metrics.totalTeachers),
    roleSlice("admin", metrics.totalAdmins),
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <OverviewHero metrics={metrics} dailyCompletions={dailyCompletions} onNavigate={onNavigate} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {buildKpis(metrics).map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-level-purple-dark">Conclusões nos últimos {dailyCompletions.length} dias</h3>
              <p className="text-xs text-muted-foreground">Lições completadas por dia</p>
            </div>
            <button onClick={() => onNavigate("analytics")} className="text-xs font-bold text-level-purple hover:underline">
              Ver detalhes →
            </button>
          </div>
          <SparkBar data={dailyCompletions} height={120} width={12} gap={4} />
        </div>
        <div className="rounded-2xl border border-border bg-white p-6">
          <h3 className="mb-3 text-sm font-extrabold text-level-purple-dark">Distribuição de usuários</h3>
          <div className="flex items-center justify-between gap-4">
            <Donut data={roleSlices} size={130} thickness={14} label="usuários" />
            <ChartLegend slices={roleSlices} />
          </div>
        </div>
      </div>

      <ActivityFeed activity={activity} onShowLogs={() => onNavigate("audit")} />
    </div>
  )
}

interface OverviewHeroProps {
  metrics: PlatformMetrics
  dailyCompletions: number[]
  onNavigate: (page: AdminPageId) => void
}

function OverviewHero({ metrics, dailyCompletions, onNavigate }: OverviewHeroProps): React.JSX.Element {
  const peakDay = Math.max(0, ...dailyCompletions)
  return (
    <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-level-purple-dark via-level-purple to-level-purple-medium p-6 text-white shadow-xl sm:p-8">
      <div className="absolute inset-0 opacity-30" style={DOTTED_BACKGROUND} />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">Painel do administrador</p>
          <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">
            Olá! 👋 A plataforma tem {pluralize(metrics.totalUsers, "usuário cadastrado", "usuários cadastrados")}.
          </h2>
          <p className="mt-2 text-sm text-white/80">
            {pluralize(metrics.publishedCourses, "curso", "cursos")} · {pluralize(metrics.publishedLessons, "lição", "lições")} ·{" "}
            {pluralize(metrics.totalCompletions, "conclusão", "conclusões")} · {pluralize(metrics.totalEnrollments, "matrícula", "matrículas")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {metrics.pendingApprovals > 0 && (
              <button
                onClick={() => onNavigate("approvals")}
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-level-purple-dark shadow-sm transition-transform hover:-translate-y-0.5"
              >
                {pluralize(metrics.pendingApprovals, "aprovação pendente", "aprovações pendentes")}
              </button>
            )}
            <button
              onClick={() => onNavigate("analytics")}
              className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition-transform hover:-translate-y-0.5"
            >
              Ver analytics
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Conclusões · {dailyCompletions.length} dias</p>
          <div className="mt-2">
            <SparkBar data={dailyCompletions} color="#FFFFFF" height={44} width={5} gap={2} />
          </div>
          <p className="mt-2 text-xs text-white/80">pico: {pluralize(peakDay, "conclusão", "conclusões")}/dia</p>
        </div>
      </div>
    </section>
  )
}

interface KpiCardProps {
  kpi: Kpi
}

function KpiCard({ kpi }: KpiCardProps): React.JSX.Element {
  const Icon = kpi.icon
  return (
    <div className="rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-level-purple-medium hover:shadow-lg">
      <div className={cn("mb-3 flex h-9 w-9 items-center justify-center rounded-xl", kpi.colorClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xl font-extrabold text-level-purple-dark">{kpi.value}</p>
      <p className="text-xs text-muted-foreground">{kpi.label}</p>
    </div>
  )
}

interface ActivityFeedProps {
  activity: RecentActivity[]
  onShowLogs: () => void
}

function ActivityFeed({ activity, onShowLogs }: ActivityFeedProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-sm font-extrabold text-level-purple-dark">Atividade recente</h3>
          <p className="text-xs text-muted-foreground">Últimas lições concluídas por alunos</p>
        </div>
        <button onClick={onShowLogs} className="text-xs font-bold text-level-purple hover:underline">
          Ver todos os logs →
        </button>
      </div>
      {activity.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">Nenhuma conclusão registrada ainda.</p>
      ) : (
        <ul className="divide-y divide-border">
          {activity.map((completion) => (
            <li key={completion.id} className="flex items-center gap-3 px-6 py-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-success/10 text-[11px] font-bold text-success">{getInitials(completion.user_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  <span className="font-semibold text-level-purple-dark">{completion.user_name}</span>{" "}
                  <span className="text-muted-foreground">concluiu &ldquo;{completion.lesson_title}&rdquo;</span>
                  {completion.xp_earned > 0 && <span className="ml-1 text-xs font-bold text-level-purple">+{completion.xp_earned} XP</span>}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatTimeAgo(completion.completed_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
