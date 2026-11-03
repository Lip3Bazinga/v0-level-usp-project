"use client"

import { useMemo } from "react"
import type { ActivityDay } from "@levelusp/contracts"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, formatDate, formatNumber } from "@/lib/utils"
import { ACTIVITY_TOOLTIP_DELAY_MS } from "@/lib/constants"
import {
  activityColor,
  countTrailingActiveDays,
  groupIntoWeeks,
  LEGEND_COLORS,
  monthLabels,
  toActivityCells,
  type DayCell,
} from "./activity-calendar"

interface ActivityMapProps {
  data: ActivityDay[]
  className?: string
}

/** Só segunda, quarta e sexta, como no GitHub, para caber na altura da grade. */
const WEEKDAY_LABELS = ["Seg", "Qua", "Sex"]
const WEEK_COLUMN_WIDTH_PX = 14
const DAY_LABELS_WIDTH_PX = 32
const GRID_HEIGHT_PX = 98

export function ActivityMap({ data, className }: ActivityMapProps): React.JSX.Element {
  const cells = useMemo(() => toActivityCells(data), [data])
  const weeks = groupIntoWeeks(cells)
  const totalXp = cells.reduce((sum, cell) => sum + cell.xp, 0)
  const activeDays = cells.filter((cell) => cell.xp > 0).length
  const currentStreak = countTrailingActiveDays(cells)

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-6", className)}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-level-purple-dark">Mapa de Atividade</h3>
          <p className="text-sm text-muted-foreground">
            {activeDays} {activeDays === 1 ? "dia ativo" : "dias ativos"} no último ano
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Menos</span>
          <div className="flex items-center gap-1">
            {LEGEND_COLORS.map((color) => (
              <div key={color} className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
            ))}
          </div>
          <span className="text-muted-foreground">Mais</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          <div className="mb-1 flex" style={{ marginLeft: `${DAY_LABELS_WIDTH_PX}px` }}>
            {monthLabels().map((label) => (
              <span
                key={label.weekIndex}
                className="text-xs text-muted-foreground"
                style={{ position: "relative", left: `${label.weekIndex * WEEK_COLUMN_WIDTH_PX}px` }}
              >
                {label.month}
              </span>
            ))}
          </div>

          <div className="flex">
            <div className="mr-2 flex flex-col justify-around" style={{ height: `${GRID_HEIGHT_PX}px` }}>
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="text-xs text-muted-foreground">
                  {label}
                </span>
              ))}
            </div>

            <TooltipProvider delayDuration={ACTIVITY_TOOLTIP_DELAY_MS}>
              <div className="flex gap-[3px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((cell, dayIndex) =>
                      cell ? (
                        <DaySquare key={dayIndex} cell={cell} />
                      ) : (
                        <div key={dayIndex} className="h-[12px] w-[12px] rounded-sm" style={{ backgroundColor: "transparent" }} />
                      ),
                    )}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-level-purple" />
          <span className="text-sm text-muted-foreground">
            <strong className="text-level-purple-dark">{formatNumber(totalXp)}</strong> XP total no ano
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">
            <strong className="text-level-purple-dark">{currentStreak}</strong> {currentStreak === 1 ? "dia" : "dias"} de sequência atual
          </span>
        </div>
      </div>
    </div>
  )
}

function DaySquare({ cell }: { cell: DayCell }): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="h-[12px] w-[12px] cursor-pointer rounded-sm transition-all hover:scale-125 hover:ring-2 hover:ring-level-purple hover:ring-offset-1"
          style={{ backgroundColor: activityColor(cell.xp) }}
        />
      </TooltipTrigger>
      <TooltipContent className="bg-level-purple-dark text-white">
        <p className="font-medium">{formatDate(cell.date, "weekdayLong")}</p>
        <p className="text-sm opacity-90">
          {cell.xp > 0 ? `${cell.xp} XP ganhos • ${cell.activities} atividades` : "Nenhuma atividade"}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
