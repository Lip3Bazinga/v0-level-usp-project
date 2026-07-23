"use client"

/** Mini gráfico de barras (sparkline) para os cards do painel admin. */
export function SparkBar({
  data,
  color = "#7C3AED",
  height = 32,
  width = 5,
  gap = 2,
}: {
  data: number[]
  color?: string
  height?: number
  width?: number
  gap?: number
}) {
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
            minHeight: 2,
          }}
          title={String(value)}
        />
      ))}
    </div>
  )
}

/** Gráfico de rosca (donut) com total no centro. */
export function Donut({
  data,
  size = 140,
  thickness = 16,
  label,
}: {
  data: { value: number; color: string; name: string }[]
  size?: number
  thickness?: number
  label?: string
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0) || 1
  const radius = size / 2 - thickness / 2 - 4
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#F3E8FF" strokeWidth={thickness} />
        {data.map((slice, index) => {
          const length = (slice.value / total) * circumference
          const segment = (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-offset}
            />
          )
          offset += length
          return segment
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label ?? "Total"}
        </span>
        <span className="text-2xl font-extrabold text-level-purple-dark">{total}</span>
      </div>
    </div>
  )
}
