import { Injectable } from "@nestjs/common"
import type { UserDataExport } from "@levelusp/contracts"
import { AppError, Conflict, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { AuthRepository } from "../auth/auth.repository"
import { PasswordService } from "../auth/password.service"
import { toLessonProgress } from "../learning/learning.mapper"
import { toLibraryRequest } from "../library/library.mapper"
import { toNote } from "../notes/notes.mapper"
import { toNotification } from "../notifications/notifications.mapper"
import { toTeacherApproval } from "../teacher-requests/teacher-requests.mapper"
import { toProfile } from "../users/profile.mapper"
import { UsersRepository } from "../users/users.repository"
import {
  toAccountExport, toBadgeExport, toCertificateExport, toEnrollmentExport, toExamAttemptExport, toSessionExport,
  toSubmissionExport,
} from "./account.mapper"
import { AccountRepository } from "./account.repository"

/** Direitos do titular (LGPD) sobre a própria conta: exportar os dados e excluí-la. */
@Injectable()
export class AccountService {
  constructor(
    private readonly repo: AccountRepository,
    private readonly users: UsersRepository,
    private readonly auth: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly rateLimit: RateLimitService,
  ) {}

  /** LGPD: o próprio usuário apaga a conta confirmando a senha. */
  async deleteMyAccount(user: AuthUser, password: string): Promise<void> {
    this.rateLimit.consume(RATE_LIMITS.accountDeletion, user.id)
    const credentials = await this.auth.findUserById(user.id)
    if (!(await this.passwords.verify(credentials?.passwordHash, password))) {
      throw new AppError(400, "INVALID_PASSWORD", "Senha incorreta.")
    }
    if (user.role === "admin" && (await this.repo.countAdmins()) <= 1) {
      throw Conflict("Você é o único administrador. Promova outra pessoa antes de excluir sua conta.", "LAST_ADMIN")
    }
    await this.repo.delete(user.id)
  }

  /** Todos os dados pessoais do usuário. Nunca inclui hash de senha nem tokens. */
  async getDataExport(userId: string): Promise<UserDataExport> {
    const [profile, account] = await Promise.all([this.users.findById(userId), this.repo.findById(userId)])
    if (!profile || !account) throw NotFound("Usuário")
    const [progress, submissions, notes, enrollments, badges, certificates, examAttempts, notifications, teacherRequests, libraryRequests, sessions] =
      await Promise.all([
        this.repo.listProgress(userId),
        this.repo.listSubmissions(userId),
        this.repo.listNotes(userId),
        this.repo.listEnrollments(userId),
        this.repo.listBadges(userId),
        this.repo.listCertificates(userId),
        this.repo.listExamAttempts(userId),
        this.repo.listNotifications(userId),
        this.repo.listTeacherRequests(userId),
        this.repo.listLibraryRequests(userId),
        this.repo.listSessions(userId),
      ])
    return {
      exported_at: new Date().toISOString(),
      profile: toProfile(profile),
      account: toAccountExport(account),
      lesson_progress: progress.map(toLessonProgress),
      submissions: submissions.map(toSubmissionExport),
      notes: notes.map((note) => toNote(note)),
      enrollments: enrollments.map(toEnrollmentExport),
      badges: badges.map(toBadgeExport),
      certificates: certificates.map(toCertificateExport),
      exam_attempts: examAttempts.map(toExamAttemptExport),
      notifications: notifications.map(toNotification),
      teacher_requests: teacherRequests.map(toTeacherApproval),
      library_requests: libraryRequests.map((request) => toLibraryRequest(request)),
      sessions: sessions.map(toSessionExport),
    }
  }

  /**
   * Exportação do próprio usuário (`GET /me/export`).
   *
   * @throws AppError 429 quando passa do limite de exportações por usuário.
   */
  getMyDataExport(user: AuthUser): Promise<UserDataExport> {
    this.rateLimit.consume(RATE_LIMITS.dataExport, user.id)
    return this.getDataExport(user.id)
  }
}
