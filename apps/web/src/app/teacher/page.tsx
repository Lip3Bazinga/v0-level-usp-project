"use client"

import { AlertTriangle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { TeacherCoursesSection } from "@/components/teacher/dashboard/teacher-courses-section"
import { TeacherHeader } from "@/components/teacher/dashboard/teacher-header"
import { TeacherLessonsSection } from "@/components/teacher/dashboard/teacher-lessons-section"
import { TeacherStats } from "@/components/teacher/dashboard/teacher-stats"
import { useTeacherContentActions } from "@/components/teacher/dashboard/use-teacher-content-actions"
import { useTeacherDashboard } from "@/components/teacher/dashboard/use-teacher-dashboard"

export default function TeacherPage(): React.JSX.Element {
  const { profile, isLoading: isAuthLoading } = useAuth()
  const { content, metricsByLesson, summary } = useTeacherDashboard(!isAuthLoading && Boolean(profile?.id))
  const actions = useTeacherContentActions(content.setData)

  const isLoading = content.status === "loading" || (content.status === "success" && content.data === null)
  const { lessons, courses } = content.status === "success" && content.data ? content.data : { lessons: [], courses: [] }
  const { pending } = actions

  return (
    <div className="min-h-screen bg-background">
      <TeacherHeader teacherName={profile?.full_name ?? null} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {content.status === "error" && (
          <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {content.error}
          </div>
        )}

        <TeacherStats lessons={lessons} summary={summary} />

        <TeacherCoursesSection
          courses={courses}
          isLoading={isLoading}
          togglingCourseId={pending.togglingCourseId}
          deletingCourseId={pending.deletingCourseId}
          onTogglePublished={(course) => void actions.toggleCoursePublished(course)}
          onDelete={(course) => void actions.deleteCourseWithConfirm(course)}
        />

        <TeacherLessonsSection
          lessons={lessons}
          isLoading={isLoading}
          metricsByLesson={metricsByLesson}
          togglingLessonId={pending.togglingLessonId}
          deletingLessonId={pending.deletingLessonId}
          onTogglePublished={(lesson) => void actions.toggleLessonPublished(lesson)}
          onDelete={(lesson) => void actions.deleteLessonWithConfirm(lesson)}
        />
      </main>
    </div>
  )
}
