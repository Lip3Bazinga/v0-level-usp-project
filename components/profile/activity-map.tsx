"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface ActivityDay {
  date: Date
  xp: number
  activities: number
}

interface ActivityMapProps {
  data: ActivityDay[]
  className?: string
}

// Get color based on XP level (purple gradient)
function getActivityColor(xp: number): string {
  if (xp === 0) return "#F3F4F6" // Gray for no activity
  if (xp < 100) return "#E9D5FF" // Very light purple
  if (xp < 200) return "#DDD6FE" // Light purple
  if (xp < 300) return "#C4B5FD" // Medium light purple
  if (xp < 400) return "#A78BFA" // Medium purple
  if (xp < 500) return "#8B5CF6" // Purple
  return "#6D28D9" // Dark purple for high XP
}

// Get month labels
function getMonthLabels() {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  const today = new Date()
  const labels: { month: string; position: number }[] = []
  
  let currentMonth = -1
  for (let i = 0; i < 53; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - (364 - i * 7))
    const month = date.getMonth()
    
    if (month !== currentMonth) {
      currentMonth = month
      labels.push({ month: months[month], position: i })
    }
  }
  
  return labels
}

// Get day labels
function getDayLabels() {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
}

// Organize data into weeks
function organizeIntoWeeks(data: ActivityDay[]): ActivityDay[][] {
  const weeks: ActivityDay[][] = []
  let currentWeek: ActivityDay[] = []

  // Sem dados: nada a organizar
  if (data.length === 0) return weeks

  // Find the first Sunday
  const firstDate = data[0].date
  const firstDayOfWeek = firstDate.getDay()
  
  // Add empty cells for days before the first date
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: new Date(0), xp: -1, activities: 0 })
  }
  
  data.forEach((day) => {
    currentWeek.push(day)
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })
  
  // Add remaining days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }
  
  return weeks
}

export function ActivityMap({ data, className }: ActivityMapProps) {
  const weeks = organizeIntoWeeks(data)
  const monthLabels = getMonthLabels()
  const dayLabels = getDayLabels()
  
  // Calculate stats
  const totalXP = data.reduce((sum, day) => sum + day.xp, 0)
  const activeDays = data.filter((day) => day.xp > 0).length
  const currentStreak = calculateStreak(data)
  
  function calculateStreak(data: ActivityDay[]): number {
    let streak = 0
    const reversedData = [...data].reverse()
    
    for (const day of reversedData) {
      if (day.xp > 0) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  }
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  return (
    <div className={cn("rounded-2xl border border-border bg-white p-6", className)}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-level-purple-dark">Mapa de Atividade</h3>
          <p className="text-sm text-muted-foreground">
            {activeDays} dias ativos no último ano
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Menos</span>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#F3F4F6" }} />
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#E9D5FF" }} />
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#C4B5FD" }} />
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#A78BFA" }} />
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: "#6D28D9" }} />
          </div>
          <span className="text-muted-foreground">Mais</span>
        </div>
      </div>

      {/* Activity Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="mb-1 flex" style={{ marginLeft: "32px" }}>
            {monthLabels.map((label, i) => (
              <span
                key={i}
                className="text-xs text-muted-foreground"
                style={{
                  position: "relative",
                  left: `${label.position * 14}px`,
                  marginRight: i < monthLabels.length - 1 ? "0" : "0",
                }}
              >
                {label.month}
              </span>
            ))}
          </div>
          
          <div className="flex">
            {/* Day labels */}
            <div className="mr-2 flex flex-col justify-around" style={{ height: "98px" }}>
              {dayLabels.filter((_, i) => i % 2 === 1).map((day, i) => (
                <span key={i} className="text-xs text-muted-foreground">
                  {day}
                </span>
              ))}
            </div>
            
            {/* Grid */}
            <TooltipProvider delayDuration={100}>
              <div className="flex gap-[3px]">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((day, dayIndex) => {
                      if (day.xp === -1) {
                        return (
                          <div
                            key={dayIndex}
                            className="h-[12px] w-[12px] rounded-sm"
                            style={{ backgroundColor: "transparent" }}
                          />
                        )
                      }
                      
                      return (
                        <Tooltip key={dayIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className="h-[12px] w-[12px] cursor-pointer rounded-sm transition-all hover:scale-125 hover:ring-2 hover:ring-level-purple hover:ring-offset-1"
                              style={{ backgroundColor: getActivityColor(day.xp) }}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="bg-level-purple-dark text-white">
                            <p className="font-medium">{formatDate(day.date)}</p>
                            <p className="text-sm opacity-90">
                              {day.xp > 0 
                                ? `${day.xp} XP ganhos • ${day.activities} atividades`
                                : "Nenhuma atividade"
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 flex flex-wrap items-center gap-6 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-level-purple" />
          <span className="text-sm text-muted-foreground">
            <strong className="text-level-purple-dark">{totalXP.toLocaleString()}</strong> XP total no ano
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-sm text-muted-foreground">
            <strong className="text-level-purple-dark">{currentStreak}</strong> dias de streak atual
          </span>
        </div>
      </div>
    </div>
  )
}
