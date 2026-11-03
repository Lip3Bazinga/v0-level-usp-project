import type {
  AccountExport, BadgeEarnedExport, CertificateExport, EnrollmentExport, ExamAttemptExport, SessionExport, SubmissionExport,
} from "@levelusp/contracts"
import type { ExamAttemptRow, SubmissionRow, UserBadgeRow } from "@levelusp/db"
import type { AccountRow, CertificateExportRow, EnrollmentExportRow, SessionExportRow } from "./account.repository"

export function toAccountExport(account: AccountRow): AccountExport {
  return {
    email: account.email,
    email_verified_at: account.emailVerifiedAt,
    last_sign_in_at: account.lastSignInAt,
    created_at: account.createdAt,
  }
}

export function toSubmissionExport(submission: SubmissionRow): SubmissionExport {
  return {
    id: submission.id,
    lesson_id: submission.lessonId,
    files: submission.files,
    status: submission.status,
    passed: submission.passed,
    result: submission.result,
    engine: submission.engine,
    duration_ms: submission.durationMs,
    created_at: submission.createdAt,
  }
}

export function toEnrollmentExport(enrollment: EnrollmentExportRow): EnrollmentExport {
  return { course_id: enrollment.courseId, course_title: enrollment.courseTitle, enrolled_at: enrollment.enrolledAt }
}

export function toBadgeExport(userBadge: UserBadgeRow): BadgeEarnedExport {
  return { badge_id: userBadge.badgeId, earned_at: userBadge.earnedAt }
}

export function toCertificateExport({ certificate, courseTitle }: CertificateExportRow): CertificateExport {
  return {
    id: certificate.id,
    course_id: certificate.courseId,
    course_title: courseTitle,
    verification_code: certificate.verificationCode,
    exam_score: certificate.examScore,
    project_status: certificate.projectStatus,
    issued_at: certificate.issuedAt,
  }
}

export function toExamAttemptExport(attempt: ExamAttemptRow): ExamAttemptExport {
  return {
    id: attempt.id,
    exam_id: attempt.examId,
    answers: attempt.answers,
    score: attempt.score,
    passed: attempt.passed,
    started_at: attempt.startedAt,
    submitted_at: attempt.submittedAt,
  }
}

export function toSessionExport(session: SessionExportRow): SessionExport {
  return {
    created_at: session.createdAt,
    last_seen_at: session.lastSeenAt,
    expires_at: session.expiresAt,
    revoked_at: session.revokedAt,
    ip: session.ip,
    user_agent: session.userAgent,
    active: session.active,
  }
}
