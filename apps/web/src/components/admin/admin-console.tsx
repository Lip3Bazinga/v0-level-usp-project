"use client"

import { useState, type ReactNode } from "react"
import type { Course, Lesson, Profile } from "@levelusp/contracts"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ROUTES } from "@/lib/constants"
import type { OnToast } from "@/lib/types"
import { ADMIN_PAGE_TITLES, readStoredAdminPage, storeAdminPage, type AdminPageId } from "./admin-pages"
import { AdminOverview } from "./admin-overview"
import { AdminSidebar, type SidebarCounts } from "./admin-sidebar"
import { AdminToast, useAdminToast } from "./admin-toast"
import { AdminTopBar, type TopBarAction } from "./admin-top-bar"
import { AnalyticsPage } from "./analytics-page"
import { ApprovalsPage } from "./approvals-page"
import { AuditPage } from "./audit-page"
import { BadgesPage } from "./badges-page"
import { CommandPalette } from "./command-palette"
import { CoursesPage } from "./courses-page"
import { ExamQuestionsPage } from "./exam-questions-page"
import { LessonsPage } from "./lessons/lessons-page"
import { LibrariesPage } from "./libraries-page"
import { ModulesPage } from "./modules-page"
import { SettingsPage } from "./settings/settings-page"
import type { AdminDashboard, ListUpdate } from "./use-admin-dashboard"
import { UsersPage } from "./users/users-page"

const PRIMARY_ACTIONS: Partial<Record<AdminPageId, TopBarAction>> = {
  lessons: { href: ROUTES.teacherNewLesson, label: "Nova Lição" },
  courses: { href: ROUTES.teacherNewCourse, label: "Novo Curso" },
}

interface AdminConsoleProps {
  dashboard: AdminDashboard
  courses: Course[]
  profile: Pick<Profile, "id" | "full_name" | "email">
  updateUsers: ListUpdate<Profile>
  updateLessons: ListUpdate<Lesson>
}

/** Casca do painel do admin: navegação lateral, barra do topo, seção ativa, busca ⌘K e avisos. */
export function AdminConsole({ dashboard, courses, profile, updateUsers, updateLessons }: AdminConsoleProps): React.JSX.Element {
  const [page, setPage] = useState<AdminPageId>(readStoredAdminPage)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const { toast, showToast } = useAdminToast()
  const { metrics } = dashboard

  const handleNavigate = (nextPage: AdminPageId): void => {
    setPage(nextPage)
    storeAdminPage(nextPage)
  }

  const sidebarProps = {
    current: page,
    counts: {
      courses: metrics.totalCourses,
      lessons: metrics.totalLessons,
      users: metrics.totalUsers,
      approvals: metrics.pendingApprovals,
    } satisfies SidebarCounts,
    profileName: profile.full_name,
    profileEmail: profile.email,
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <div className="hidden lg:flex">
        <AdminSidebar {...sidebarProps} onNavigate={handleNavigate} />
      </div>

      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menu de navegação do admin</SheetTitle>
          <SheetDescription className="sr-only">Seções do painel de administração</SheetDescription>
          <AdminSidebar
            {...sidebarProps}
            onNavigate={(nextPage) => {
              handleNavigate(nextPage)
              setIsMobileNavOpen(false)
            }}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar title={ADMIN_PAGE_TITLES[page]} primaryAction={PRIMARY_ACTIONS[page]} onMenuClick={() => setIsMobileNavOpen(true)} />
        <div className="flex-1 overflow-y-auto">
          <AdminSection
            page={page}
            dashboard={dashboard}
            currentUserId={profile.id}
            onNavigate={handleNavigate}
            onToast={showToast}
            updateUsers={updateUsers}
            updateLessons={updateLessons}
          />
        </div>
      </div>

      <CommandPalette users={dashboard.users} lessons={dashboard.lessons} courses={courses} onNavigate={handleNavigate} />
      <AdminToast toast={toast} />
    </div>
  )
}

interface AdminSectionProps {
  page: AdminPageId
  dashboard: AdminDashboard
  currentUserId: string
  onNavigate: (page: AdminPageId) => void
  onToast: OnToast
  updateUsers: ListUpdate<Profile>
  updateLessons: ListUpdate<Lesson>
}

function AdminSection({ page, dashboard, currentUserId, onNavigate, onToast, updateUsers, updateLessons }: AdminSectionProps): ReactNode {
  switch (page) {
    case "overview":
      return (
        <AdminOverview
          metrics={dashboard.metrics}
          activity={dashboard.activity}
          dailyCompletions={dashboard.dailyCompletions}
          onNavigate={onNavigate}
        />
      )
    case "users":
      return <UsersPage users={dashboard.users} updateUsers={updateUsers} onToast={onToast} currentUserId={currentUserId} />
    case "courses":
      return <CoursesPage onToast={onToast} />
    case "lessons":
      return <LessonsPage lessons={dashboard.lessons} updateLessons={updateLessons} onToast={onToast} />
    case "analytics":
      return <AnalyticsPage />
    case "modules":
      return <ModulesPage lessons={dashboard.lessons} onToast={onToast} />
    case "badges":
      return <BadgesPage onToast={onToast} />
    case "approvals":
      return <ApprovalsPage onToast={onToast} />
    case "audit":
      return <AuditPage />
    case "libraries":
      return <LibrariesPage onToast={onToast} />
    case "exams":
      return <ExamQuestionsPage onToast={onToast} />
    case "settings":
      return <SettingsPage onToast={onToast} />
  }
}
