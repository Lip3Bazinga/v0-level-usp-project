import type { ActivityDay } from "@levelusp/contracts"
import { cycleItem, indexBy, isNonEmpty, type NonEmptyArray } from "@/lib/utils"

/** Célula do mapa (data já convertida para Date local). */
export interface DayCell {
  date: Date
  xp: number
  activities: number
}

/** Semana do mapa: `null` completa a primeira semana antes do primeiro dia. */
export type CalendarWeek = (DayCell | null)[]

export interface MonthLabel {
  month: string
  /** Índice da semana em que o mês começa. */
  weekIndex: number
}

const DAYS_IN_MAP = 365
const DAYS_PER_WEEK = 7
const WEEKS_IN_MAP = 53
const MONTH_NAMES: NonEmptyArray<string> = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

/** Faixas de XP do dia → cor (mais XP, roxo mais escuro). */
const ACTIVITY_COLORS: readonly { maxXpExclusive: number; color: string }[] = [
  { maxXpExclusive: 1, color: "#F3F4F6" },
  { maxXpExclusive: 100, color: "#E9D5FF" },
  { maxXpExclusive: 200, color: "#DDD6FE" },
  { maxXpExclusive: 300, color: "#C4B5FD" },
  { maxXpExclusive: 400, color: "#A78BFA" },
  { maxXpExclusive: 500, color: "#8B5CF6" },
]
const MAX_ACTIVITY_COLOR = "#6D28D9"

/** Amostras da legenda "Menos … Mais". */
export const LEGEND_COLORS = ["#F3F4F6", "#E9D5FF", "#C4B5FD", "#A78BFA", "#6D28D9"]

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

/**
 * Converte os dias da API (datas ISO yyyy-mm-dd, possivelmente esparsos) em
 * 365 células contínuas terminando hoje. Datas são interpretadas no fuso
 * local (new Date("yyyy-mm-dd") seria UTC e cairia no dia anterior no Brasil).
 */
export function toActivityCells(days: readonly ActivityDay[], today = new Date()): DayCell[] {
  const dayByKey = indexBy(days, (day) => day.date.slice(0, 10))
  return Array.from({ length: DAYS_IN_MAP }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAYS_IN_MAP - 1 - index))
    const day = dayByKey.get(toLocalDateKey(date))
    return { date, xp: day?.xp ?? 0, activities: day?.activities ?? 0 }
  })
}

export function activityColor(xp: number): string {
  return ACTIVITY_COLORS.find((band) => xp < band.maxXpExclusive)?.color ?? MAX_ACTIVITY_COLOR
}

/** Colunas de domingo a sábado; a primeira semana começa com espaços vazios. */
export function groupIntoWeeks(cells: readonly DayCell[]): CalendarWeek[] {
  if (!isNonEmpty(cells)) return []
  const leadingBlanks: CalendarWeek = Array.from({ length: cells[0].date.getDay() }, () => null)
  const slots: CalendarWeek = [...leadingBlanks, ...cells]
  const weeks: CalendarWeek[] = []
  for (let start = 0; start < slots.length; start += DAYS_PER_WEEK) weeks.push(slots.slice(start, start + DAYS_PER_WEEK))
  return weeks
}

export function monthLabels(today = new Date()): MonthLabel[] {
  const labels: MonthLabel[] = []
  let previousMonth = -1
  for (let weekIndex = 0; weekIndex < WEEKS_IN_MAP; weekIndex++) {
    const date = new Date(today)
    date.setDate(date.getDate() - (DAYS_IN_MAP - 1 - weekIndex * DAYS_PER_WEEK))
    const month = date.getMonth()
    if (month === previousMonth) continue
    previousMonth = month
    labels.push({ month: cycleItem(MONTH_NAMES, month), weekIndex })
  }
  return labels
}

/** Dias seguidos com XP, contando de hoje para trás. */
export function countTrailingActiveDays(cells: readonly DayCell[]): number {
  let streak = 0
  for (let index = cells.length - 1; index >= 0 && (cells[index]?.xp ?? 0) > 0; index--) streak++
  return streak
}
