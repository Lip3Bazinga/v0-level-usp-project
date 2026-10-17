import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import {
  certificates, courses, enrollments, examAttempts, lessonProgress, libraryRequests, notes, notifications, profiles,
  sessions, submissions, teacherApprovals, userBadges, users,
} from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

@Injectable()
export class AccountRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  findProfile(id: string) {
    return this.db.query.profiles.findFirst({ where: eq(profiles.id, id) })
  }

  /** Dados da credencial SEM o hash de senha (seleção explícita de colunas). */
  findAccount(id: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { email: true, emailVerifiedAt: true, lastSignInAt: true, createdAt: true },
    })
  }

  countAdmins() {
    return this.db.$count(profiles, eq(profiles.role, "admin"))
  }

  /** Apaga a credencial; o perfil e todos os dados do usuário saem em cascata. */
  async deleteUser(id: string): Promise<boolean> {
    const rows = await this.db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
    return rows.length > 0
  }

  progress(userId: string) {
    return this.db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)).orderBy(asc(lessonProgress.createdAt))
  }

  submissions(userId: string) {
    return this.db.select().from(submissions).where(eq(submissions.userId, userId)).orderBy(asc(submissions.createdAt))
  }

  notes(userId: string) {
    return this.db.select().from(notes).where(eq(notes.userId, userId)).orderBy(asc(notes.createdAt))
  }

  enrollments(userId: string) {
    return this.db
      .select({ courseId: enrollments.courseId, courseTitle: courses.title, enrolledAt: enrollments.enrolledAt })
      .from(enrollments)
      .leftJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.userId, userId))
      .orderBy(asc(enrollments.enrolledAt))
  }

  badges(userId: string) {
    return this.db.select().from(userBadges).where(eq(userBadges.userId, userId)).orderBy(asc(userBadges.earnedAt))
  }

  certificates(userId: string) {
    return this.db
      .select({ c: certificates, courseTitle: courses.title })
      .from(certificates)
      .leftJoin(courses, eq(courses.id, certificates.courseId))
      .where(eq(certificates.userId, userId))
      .orderBy(asc(certificates.issuedAt))
  }

  examAttempts(userId: string) {
    return this.db.select().from(examAttempts).where(eq(examAttempts.userId, userId)).orderBy(asc(examAttempts.startedAt))
  }

  notifications(userId: string) {
    return this.db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt))
  }

  teacherRequests(userId: string) {
    return this.db.select().from(teacherApprovals).where(eq(teacherApprovals.userId, userId)).orderBy(asc(teacherApprovals.submittedAt))
  }

  libraryRequests(userId: string) {
    return this.db.select().from(libraryRequests).where(eq(libraryRequests.requestedBy, userId)).orderBy(asc(libraryRequests.createdAt))
  }

  /** Metadados das sessões. O id (hash do token) nunca é exportado. */
  sessions(userId: string) {
    return this.db
      .select({
        createdAt: sessions.createdAt, lastSeenAt: sessions.lastSeenAt, expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt, ip: sessions.ip, userAgent: sessions.userAgent,
        active: sql<boolean>`${sessions.revokedAt} is null and ${sessions.expiresAt} > now()`,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, userId)))
      .orderBy(desc(sessions.createdAt))
  }
}
