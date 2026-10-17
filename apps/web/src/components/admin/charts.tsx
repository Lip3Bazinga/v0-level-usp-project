"use client"

const BRAND_PURPLE = "#7C3AED"
const DONUT_TRACK_COLOR = "#F3E8FF"
const MIN_BAR_HEIGHT_PX = 2

export interface ChartSlice {
  name: string
  value: number
  color: string
}

interface SparkBarProps {
  data: number[]
  color?: string
  height?: number
  width?: number
  gap?: number
}

/** Mini gráfico de barras (sparkline) para os cards do painel admin. */
export function SparkBar({ data, color = BRAND_PURPLE, height = 32, width = 5, gap = 2 }: SparkBarProps) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end" style={{ height, gap }}>
      {data.map((value, index) => (
        <div
          key={index}
          className="rounded-t-sm"
          style={{
            height: `${(value / max) * 100}%`,
            width,
            background: `linear-gradient(to top, ${color}, ${color}77)`,
            minHeight: MIN_BAR_HEIGHT_PX,
          }}
          title={String(value)}
        />
      ))}
    </div>
  )
}

interface DonutSegment extends ChartSlice {
  length: number
  offset: number
}

/** Comprimento e início de cada fatia ao longo da circunferência. */
function toDonutSegments(slices: ChartSlice[], total: number, circumference: number): DonutSegment[] {
  const segments: DonutSegment[] = []
  for (const slice of slices) {
    const previous = segments.at(-1)
    segments.push({
      ...slice,
      length: (slice.value / total) * circumference,
      offset: previous ? previous.offset + previous.length : 0,
    })
  }
  return segments
}

interface DonutProps {
  data: ChartSlice[]
  size?: number
  thickness?: number
  label?: string
}

/** Gráfico de rosca (donut) com total no centro. */
export function Donut({ data, size = 140, thickness = 16, label = "Total" }: DonutProps) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1
  const radius = size / 2 - thickness / 2 - 4
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const segments = toDonutSegments(data, total, circumference)

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={DONUT_TRACK_COLOR} strokeWidth={thickness} />
        {segments.map((segment) => (
          <circle
            key={segment.name}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={thickness}
            strokeDasharray={`${segment.length} ${circumference}`}
            strokeDashoffset={-segment.offset}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-2xl font-extrabold text-level-purple-dark">{total}</span>
      </div>
    </div>
  )
}

interface ChartLegendProps {
  slices: ChartSlice[]
}

/** Legenda (cor, nome e valor) ao lado do `Donut`. */
export function ChartLegend({ slices }: ChartLegendProps) {
  return (
    <ul className="space-y-2 text-xs">
      {slices.map((slice) => (
        <li key={slice.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: slice.color }} />
          <span className="text-muted-foreground">{slice.name}</span>
          <span className="font-bold text-level-purple-dark">{slice.value}</span>
        </li>
      ))}
    </ul>
  )
}
