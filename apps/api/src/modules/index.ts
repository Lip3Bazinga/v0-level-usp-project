import { AccountModule } from "./account/account.module"
import { AdminModule } from "./admin/admin.module"
import { AuditModule } from "./audit/audit.module"
import { AuthModule } from "./auth/auth.module"
import { CatalogModule } from "./catalog/catalog.module"
import { CertificatesModule } from "./certificates/certificates.module"
import { ExamsModule } from "./exams/exams.module"
import { GamificationModule } from "./gamification/gamification.module"
import { HealthModule } from "./health/health.module"
import { LearningModule } from "./learning/learning.module"
import { LibraryModule } from "./library/library.module"
import { NotesModule } from "./notes/notes.module"
import { NotificationsModule } from "./notifications/notifications.module"
import { QuizzesModule } from "./quizzes/quizzes.module"
import { TeacherRequestsModule } from "./teacher-requests/teacher-requests.module"
import { UsersModule } from "./users/users.module"

/**
 * Módulos de funcionalidade. Cada um é dono do seu pedaço do domínio:
 * controller (HTTP fino) → service (regras) → repository (SQL via Drizzle).
 */
export const FEATURE_MODULES = [
  HealthModule,
  AuditModule,
  GamificationModule,
  AuthModule,
  AccountModule,
  UsersModule,
  CatalogModule,
  LearningModule,
  QuizzesModule,
  ExamsModule,
  CertificatesModule,
  NotesModule,
  NotificationsModule,
  LibraryModule,
  TeacherRequestsModule,
  AdminModule,
]
