import { BarChart3, FileText, Send, TrendingUp, type LucideIcon } from "lucide-react"
import type { Lesson } from "@levelusp/contracts"
import { formatNumber, cn } from "@/lib/utils"
import { formatPassRate, type MetricsSummary } from "../lesson-metrics"

interface StatCardProps {
  icon: LucideIcon
  iconClassName: string
  value: string
  label: string
}

function StatCard({ icon: Icon, iconClassName, value, label }: StatCardProps): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-level-purple-dark">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

interface TeacherStatsProps {
  lessons: Lesson[]
  summary: MetricsSummary
}

export function TeacherStats({ lessons, summary }: TeacherStatsProps): React.JSX.Element {
  const publishedCount = lessons.filter((lesson) => lesson.published).length
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={FileText}
        iconClassName="bg-level-purple-light text-level-purple"
        value={`${publishedCount}/${lessons.length}`}
        label="Lições Publicadas"
      />
      <StatCard
        icon={TrendingUp}
        iconClassName="bg-success/10 text-success"
        value={formatNumber(summary.completed)}
        label={`Conclusões de alunos · ${formatNumber(summary.started)} iniciaram`}
      />
      <StatCard icon={Send} iconClassName="bg-level-purple-light text-level-purple" value={formatNumber(summary.submissions)} label="Envios para correção" />
      <StatCard
        icon={BarChart3}
        iconClassName="bg-level-purple-light text-level-purple"
        value={formatPassRate(summary.passRate)}
        label="Aprovação média dos envios"
      />
    </div>
  )
}
