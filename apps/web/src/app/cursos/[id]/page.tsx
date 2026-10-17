"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react"
import { ROUTES } from "@/lib/constants"
import { EnrollmentModal } from "@/components/gamification/enrollment-modal"
import { CourseCompleteModal } from "@/components/gamification/course-complete-modal"
import { BrandLogo } from "@/components/design-system/brand-logo"
import { StudentHeaderBar } from "@/components/dashboard/student-shell"
import { CourseHero, EnrollButton } from "./course-hero"
import { CertificationSection, CourseLessonList, CourseSidebar, FinalProjectSection } from "./course-sections"
import { useCourseDetail } from "./use-course-detail"

export default function CourseDetailPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const detail = useCourseDetail(courseId)
  const { course, lessons, statuses, isEnrolled, isAllDone } = detail

  if (detail.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <BookOpen className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-level-purple-dark">{detail.loadError ?? "Curso não encontrado."}</h2>
        <button
          onClick={() => router.push(ROUTES.courses)}
          className="rounded-xl bg-level-purple px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
        >
          Ver todos os cursos
        </button>
      </div>
    )
  }

  const hasFinalProject = Boolean(course.final_project_title?.trim())
  const isFinalProjectUnlocked = isAllDone && isEnrolled

  const handleStartLesson = () => {
    const nextLesson = lessons.find((_, index) => statuses[index] !== "completed") ?? lessons[0]
    if (nextLesson) router.push(ROUTES.lesson(nextLesson.id))
  }

  // O projeto final é a última lição do curso.
  const handleStartFinalProject = () => {
    const lastLesson = lessons[lessons.length - 1]
    if (lastLesson) router.push(ROUTES.lesson(lastLesson.id))
  }

  return (
    <>
      <EnrollmentModal
        isOpen={detail.isEnrollAnimationOpen}
        courseTitle={course.title}
        courseXp={course.total_xp}
        onClose={detail.closeEnrollAnimation}
      />
      <CourseCompleteModal
        isOpen={detail.isCompleteModalOpen}
        courseTitle={course.title}
        courseXp={course.total_xp}
        hasCertificate
        onClose={detail.closeCompleteModal}
        onDownloadCertificate={detail.downloadCertificate}
      />

      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <StudentHeaderBar>
          <BrandLogo href={ROUTES.dashboard} />
          <Link
            href={ROUTES.courses}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-level-purple"
          >
            <ArrowLeft className="h-4 w-4" /> Todos os cursos
          </Link>
        </StudentHeaderBar>

        <CourseHero
          course={course}
          lessonCount={lessons.length}
          completedCount={detail.completedCount}
          hasFinalProject={hasFinalProject}
          isEnrolled={isEnrolled}
          isEnrolling={detail.isEnrolling}
          isAllDone={isAllDone}
          onStart={handleStartLesson}
          onToggleEnrollment={detail.toggleEnrollment}
          onDownloadCertificate={detail.downloadCertificate}
        />

        <main className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-8 md:col-span-2">
              {course.long_description && (
                <section>
                  <h2 className="mb-3 text-xl font-bold text-level-purple-dark">Sobre este curso</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{course.long_description}</ReactMarkdown>
                  </div>
                </section>
              )}

              <section>
                <h2 className="mb-4 text-xl font-bold text-level-purple-dark">
                  Conteúdo do curso
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({lessons.length} lições)</span>
                </h2>
                <CourseLessonList lessons={lessons} statuses={statuses} isEnrolled={isEnrolled} />
              </section>

              {isEnrolled && detail.examStatus && (
                <CertificationSection courseId={courseId} examStatus={detail.examStatus} certificateCode={detail.certificateCode} />
              )}

              {hasFinalProject && (
                <FinalProjectSection
                  course={course}
                  lessonCount={lessons.length}
                  isUnlocked={isFinalProjectUnlocked}
                  onStart={handleStartFinalProject}
                />
              )}
            </div>

            <div className="space-y-5">
              <CourseSidebar course={course} lessons={lessons} hasFinalProject={hasFinalProject} />
              {!isEnrolled && (
                <div className="md:hidden">
                  <EnrollButton isEnrolling={detail.isEnrolling} onEnroll={detail.toggleEnrollment} className="py-3.5" />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
