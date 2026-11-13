import type { Track, TrackCertificate, TrackCertificateIssue, TrackCourse, TrackCourseStatus } from "@levelusp/contracts"
import type { TrackCertificateRow, TrackRow } from "@levelusp/db"
import { toIsoTimestamp } from "@/common/time/time"
import { toCourse } from "../catalog/catalog.mapper"
import type { TrackCertificateSummaryRow, TrackCourseWithRow } from "./tracks.repository"

/** Trilha no formato do contrato; `courseCount` só entra nas listagens. */
export function toTrack(track: TrackRow, courseCount?: number): Track {
  return {
    id: track.id,
    slug: track.slug,
    title: track.title,
    description: track.description,
    icon: track.icon,
    color: track.color,
    sort_order: track.sortOrder,
    published: track.published,
    certificate_title: track.certificateTitle,
    created_at: track.createdAt,
    updated_at: track.updatedAt,
    ...(courseCount === undefined ? {} : { course_count: courseCount }),
  }
}

/** Curso da trilha com a posição e a situação do aluno. */
export function toTrackCourse({ course, position, lessonCount }: TrackCourseWithRow, status: TrackCourseStatus, enrolled?: boolean): TrackCourse {
  return { ...toCourse(course, { lessonCount, ...(enrolled === undefined ? {} : { enrolled }) }), position, student_status: status }
}

/** Certificado de trilha do aluno no formato do contrato. */
export function toTrackCertificate(certificate: TrackCertificateSummaryRow): TrackCertificate {
  return {
    id: certificate.id,
    user_id: certificate.userId,
    track_id: certificate.trackId,
    track_title: certificate.trackTitle,
    certificate_title: certificate.certificateTitle || certificate.trackTitle,
    verification_code: certificate.verificationCode,
    issued_at: toIsoTimestamp(certificate.issuedAt),
  }
}

/** Resposta da emissão; `alreadyIssued` diferencia a primeira emissão das repetidas. */
export function toTrackCertificateIssue(certificate: Pick<TrackCertificateRow, "verificationCode" | "issuedAt">, alreadyIssued: boolean): TrackCertificateIssue {
  return { issued: true, already_issued: alreadyIssued, verification_code: certificate.verificationCode, issued_at: toIsoTimestamp(certificate.issuedAt) }
}
