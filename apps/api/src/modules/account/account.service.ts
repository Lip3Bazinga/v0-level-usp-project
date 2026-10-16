import { Injectable } from "@nestjs/common"
import type { UserDataExport } from "@levelusp/contracts"
import { AppError, Conflict, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { AuthRepository } from "../auth/auth.repository"
import { PasswordService } from "../auth/password.service"
import { toLibraryRequest } from "../library/library.repository"
import { toProgress } from "../learning/learning.repository"
import { toNote } from "../notes/notes.repository"
import { toNotification } from "../notifications/notifications.repository"
import { toTeacherApproval } from "../teacher-requests/teacher-requests.repository"
import { toProfile } from "../users/profile.mapper"
import { AccountRepository } from "./account.repository"

@Injectable()
export class AccountService {
  constructor(
    private readonly repo: AccountRepository,
    private readonly auth: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** LGPD: o próprio usuário apaga a conta confirmando a senha. */
  async deleteMe(user: AuthUser, password: string): Promise<void> {
    this.rateLimit.consume(`account.delete:${user.id}`, 5, 15 * 60_000)
    const creds = await this.auth.findUserById(user.id)
    if (!(await this.passwords.verify(creds?.passwordHash, password))) {
      throw new AppError(400, "INVALID_PASSWORD", "Senha incorreta.")
    }
    if (user.role === "admin" && (await this.repo.countAdmins()) <= 1) {
      throw Conflict("Você é o único administrador. Promova outra pessoa antes de excluir sua conta.", "LAST_ADMIN")
    }
    await this.repo.deleteUser(user.id)
  }

  /** Todos os dados pessoais do usuário. Nunca inclui hash de senha nem tokens. */
  async exportData(userId: string): Promise<UserDataExport> {
    const [profile, account] = await Promise.all([this.repo.findProfile(userId), this.repo.findAccount(userId)])
    if (!profile || !account) throw NotFound("Usuário")
    const [progress, subs, notes, enrollments, badges, certs, attempts, notifications, teacher, library, sessions] = await Promise.all([
      this.repo.progress(userId),
      this.repo.submissions(userId),
      this.repo.notes(userId),
      this.repo.enrollments(userId),
      this.repo.badges(userId),
      this.repo.certificates(userId),
      this.repo.examAttempts(userId),
      this.repo.notifications(userId),
      this.repo.teacherRequests(userId),
      this.repo.libraryRequests(userId),
      this.repo.sessions(userId),
    ])
    return {
      exported_at: new Date().toISOString(),
      profile: toProfile(profile),
      account: {
        email: account.email,
        email_verified_at: account.emailVerifiedAt,
        last_sign_in_at: account.lastSignInAt,
        created_at: account.createdAt,
      },
      lesson_progress: progress.map(toProgress),
      submissions: subs.map((s) => ({
        id: s.id, lesson_id: s.lessonId, files: s.files, status: s.status, passed: s.passed, result: s.result,
        engine: s.engine, duration_ms: s.durationMs, created_at: s.createdAt,
      })),
      notes: notes.map((n) => toNote(n)),
      enrollments: enrollments.map((e) => ({ course_id: e.courseId, course_title: e.courseTitle, enrolled_at: e.enrolledAt })),
      badges: badges.map((b) => ({ badge_id: b.badgeId, earned_at: b.earnedAt })),
      certificates: certs.map(({ c, courseTitle }) => ({
        id: c.id, course_id: c.courseId, course_title: courseTitle, verification_code: c.verificationCode,
        exam_score: c.examScore, project_status: c.projectStatus, issued_at: c.issuedAt,
      })),
      exam_attempts: attempts.map((a) => ({
        id: a.id, exam_id: a.examId, answers: a.answers, score: a.score, passed: a.passed,
        started_at: a.startedAt, submitted_at: a.submittedAt,
      })),
      notifications: notifications.map(toNotification),
      teacher_requests: teacher.map(toTeacherApproval),
      library_requests: library.map((r) => toLibraryRequest(r)),
      sessions: sessions.map((s) => ({
        created_at: s.createdAt, last_seen_at: s.lastSeenAt, expires_at: s.expiresAt, revoked_at: s.revokedAt,
        ip: s.ip, user_agent: s.userAgent, active: s.active,
      })),
    }
  }

  exportMine(user: AuthUser): Promise<UserDataExport> {
    this.rateLimit.consume(`account.export:${user.id}`, 10, 60 * 60_000)
    return this.exportData(user.id)
  }
}
