import { Injectable } from "@nestjs/common"
import { asc, desc, eq, sql } from "drizzle-orm"
import {
  certificates, courses, enrollments, examAttempts, lessonProgress, libraryRequests, notes, notifications, profiles,
  sessions, submissions, teacherApprovals, userBadges, users,
} from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type {
  CertificateRow, ExamAttemptRow, LessonProgressRow, LibraryRequestRow, NoteRow, NotificationRow, SessionRow, SubmissionRow,
  TeacherApprovalRow, UserBadgeRow, UserRow,
} from "@levelusp/db"

/** Credencial sem o hash de senha. */
export type AccountRow = Pick<UserRow, "createdAt" | "email" | "emailVerifiedAt" | "lastSignInAt">

/** Matrícula com o título do curso (null se o curso foi apagado). */
export interface EnrollmentExportRow {
  courseId: string
  courseTitle: string | null
  enrolledAt: string
}

/** Certificado com o título do curso (null se o curso foi apagado). */
export interface CertificateExportRow {
  certificate: CertificateRow
  courseTitle: string | null
}

/** Metadados de sessão (sem o id, que é o hash do token) e se ela ainda vale. */
export type SessionExportRow = Pick<SessionRow, "createdAt" | "lastSeenAt" | "expiresAt" | "revokedAt" | "ip" | "userAgent"> & {
  active: boolean
}

/** Leituras da exportação LGPD e exclusão da conta. */
@Injectable()
export class AccountRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Dados da credencial SEM o hash de senha (seleção explícita de colunas). */
  findById(id: string): Promise<AccountRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { email: true, emailVerifiedAt: true, lastSignInAt: true, createdAt: true },
    })
  }

  countAdmins(): Promise<number> {
    return this.db.$count(profiles, eq(profiles.role, "admin"))
  }

  /** Apaga a credencial; o perfil e todos os dados do usuário saem em cascata. */
  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
    return deleted.length > 0
  }

  listProgress(userId: string): Promise<LessonProgressRow[]> {
    return this.db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)).orderBy(asc(lessonProgress.createdAt))
  }

  listSubmissions(userId: string): Promise<SubmissionRow[]> {
    return this.db.select().from(submissions).where(eq(submissions.userId, userId)).orderBy(asc(submissions.createdAt))
  }

  listNotes(userId: string): Promise<NoteRow[]> {
    return this.db.select().from(notes).where(eq(notes.userId, userId)).orderBy(asc(notes.createdAt))
  }

  listEnrollments(userId: string): Promise<EnrollmentExportRow[]> {
    return this.db
      .select({ courseId: enrollments.courseId, courseTitle: courses.title, enrolledAt: enrollments.enrolledAt })
      .from(enrollments)
      .leftJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.userId, userId))
      .orderBy(asc(enrollments.enrolledAt))
  }

  listBadges(userId: string): Promise<UserBadgeRow[]> {
    return this.db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(asc(userBadges.earnedAt))
  }

  listCertificates(userId: string): Promise<CertificateExportRow[]> {
    return this.db
      .select({ certificate: certificates, courseTitle: courses.title })
      .from(certificates)
      .leftJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.userId, userId))
      .orderBy(asc(certificates.issuedAt))
  }

  listExamAttempts(userId: string): Promise<ExamAttemptRow[]> {
    return this.db.select().from(examAttempts).where(eq(examAttempts.userId, userId)).orderBy(asc(examAttempts.startedAt))
  }

  listNotifications(userId: string): Promise<NotificationRow[]> {
    return this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt))
  }

  listTeacherRequests(userId: string): Promise<TeacherApprovalRow[]> {
    return this.db.select().from(teacherApprovals).where(eq(teacherApprovals.userId, userId)).orderBy(asc(teacherApprovals.submittedAt))
  }

  listLibraryRequests(userId: string): Promise<LibraryRequestRow[]> {
    return this.db.select().from(libraryRequests).where(eq(libraryRequests.requestedBy, userId)).orderBy(asc(libraryRequests.createdAt))
  }

  /** Metadados das sessões. O id (hash do token) nunca é exportado. */
  listSessions(userId: string): Promise<SessionExportRow[]> {
    return this.db
      .select({
        createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt, ip: sessions.ip, userAgent: sessions.userAgent,
        active: sql<boolean>`${sessions.revokedAt} is null and ${sessions.expiresAt} > now()`,
      })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
  }
}
