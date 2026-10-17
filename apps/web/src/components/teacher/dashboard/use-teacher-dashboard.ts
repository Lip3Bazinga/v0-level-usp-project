"use client"

import { useMemo } from "react"
import type { Course, Lesson, LessonMetrics } from "@levelusp/contracts"
import { useAsyncResource, type AsyncResource } from "@/hooks/use-async-resource"
import { fetchTeacherCourses, fetchTeacherLessons, fetchTeacherMetrics } from "@/lib/api"
import { indexBy } from "@/lib/utils"
import { summarizeMetrics, type MetricsSummary } from "../lesson-metrics"

export interface TeacherContent {
  lessons: Lesson[]
  courses: Course[]
}

const NO_METRICS: LessonMetrics[] = []

async function loadTeacherContent(): Promise<TeacherContent> {
  const [lessons, courses] = await Promise.all([fetchTeacherLessons(), fetchTeacherCourses()])
  return { lessons, courses }
}

interface TeacherDashboard {
  /** `null` enquanto a sessão ainda carrega. */
  content: AsyncResource<TeacherContent | null>
  metricsByLesson: Map<string, LessonMetrics>
  summary: MetricsSummary
}

/**
 * Lições e cursos do professor e as métricas de cada lição. As métricas são
 * complementares: uma falha nelas não bloqueia o painel.
 */
export function useTeacherDashboard(canLoad: boolean): TeacherDashboard {
  const content = useAsyncResource(async () => (canLoad ? loadTeacherContent() : null), [canLoad], {
    errorMessage: "Não foi possível carregar suas lições e cursos.",
  })
  const metrics = useAsyncResource(async () => (canLoad ? fetchTeacherMetrics() : NO_METRICS), [canLoad])
  const metricsList = metrics.status === "success" ? metrics.data : NO_METRICS
  const metricsByLesson = useMemo(() => indexBy(metricsList, (lessonMetrics) => lessonMetrics.lesson_id), [metricsList])
  const summary = useMemo(() => summarizeMetrics(metricsList), [metricsList])
  return { content, metricsByLesson, summary }
}
