import { Injectable } from "@nestjs/common"
import { and, asc, eq, inArray, sql } from "drizzle-orm"
import {
  certificates, courseCompletions, courses, enrollments, lessonProgress, lessons, trackCertificates, trackCourses, tracks,
  type CourseRow, type DbExecutor, type TrackCertificateRow, type TrackInsert, type TrackRow,
} from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"

/** Trilha com a contagem de cursos publicados, para as listagens. */
export interface TrackWithCountRow {
  track: TrackRow
  courseCount: number
}

/** Curso na trilha com a posição e a contagem de lições publicadas. */
export interface TrackCourseWithRow {
  course: CourseRow
  position: number
  lessonCount: number
}

/** O que o aluno já fez nos cursos consultados. */
export interface StudentStanding {
  enrolled: Set<string>
  started: Set<string>
  completed: Set<string>
  certified: Set<string>
}

/** Certificado de trilha do aluno, com os títulos da trilha. */
export interface TrackCertificateSummaryRow extends TrackCertificateRow {
  trackTitle: string
  certificateTitle: string
}

const publishedCourseCount = sql<number>`(
  select count(*)::int from track_courses tc join courses c on c.id = tc.course_id
  where tc.track_id = "tracks"."id" and c.published = true)`

const publishedLessonCount = sql<number>`(select count(*)::int from lessons l where l.course_id = "courses"."id" and l.published = true)`

/** Trilhas, a sequência de cursos de cada uma e os certificados de trilha. */
@Injectable()
export class TracksRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Trilhas na ordem de exibição; `onlyPublished` esconde os rascunhos. */
  list(onlyPublished: boolean): Promise<TrackWithCountRow[]> {
    return this.db
      .select({ track: tracks, courseCount: publishedCourseCount })
      .from(tracks)
      .where(onlyPublished ? eq(tracks.published, true) : undefined)
      .orderBy(asc(tracks.sortOrder), asc(tracks.title))
  }

  /** Trilha pelo slug, publicada ou não. */
  findBySlug(slug: string): Promise<TrackRow | undefined> {
    return this.db.query.tracks.findFirst({ where: eq(tracks.slug, slug) })
  }

  /** Trilha pelo id, publicada ou não. */
  findById(id: string, executor: DbExecutor = this.db): Promise<TrackRow | undefined> {
    return executor.query.tracks.findFirst({ where: eq(tracks.id, id) })
  }

  /** Cursos da trilha na ordem; `onlyPublished` esconde cursos em rascunho. */
  listCourses(trackId: string, onlyPublished: boolean): Promise<TrackCourseWithRow[]> {
    return this.db
      .select({ course: courses, position: trackCourses.position, lessonCount: publishedLessonCount })
      .from(trackCourses)
      .innerJoin(courses, eq(courses.id, trackCourses.courseId))
      .where(and(eq(trackCourses.trackId, trackId), onlyPublished ? eq(courses.published, true) : undefined))
      .orderBy(asc(trackCourses.position))
  }

  /** Quais dos cursos informados existem. */
  async listExistingCourseIds(courseIds: string[]): Promise<Set<string>> {
    if (courseIds.length === 0) return new Set()
    const found = await this.db.select({ id: courses.id }).from(courses).where(inArray(courses.id, courseIds))
    return new Set(found.map((course) => course.id))
  }

  /** Matrícula, lições iniciadas, conclusão e certificado do aluno nos cursos informados. */
  async findStanding(userId: string, courseIds: string[]): Promise<StudentStanding> {
    if (courseIds.length === 0) return { enrolled: new Set(), started: new Set(), completed: new Set(), certified: new Set() }
    const [enrolled, started, completed, certified] = await Promise.all([
      this.db.select({ courseId: enrollments.courseId }).from(enrollments).where(and(eq(enrollments.userId, userId), inArray(enrollments.courseId, courseIds))),
      this.db
        .selectDistinct({ courseId: lessons.courseId })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .where(and(eq(lessonProgress.userId, userId), inArray(lessons.courseId, courseIds))),
      this.db.select({ courseId: courseCompletions.courseId }).from(courseCompletions).where(and(eq(courseCompletions.userId, userId), inArray(courseCompletions.courseId, courseIds))),
      this.db.select({ courseId: certificates.courseId }).from(certificates).where(and(eq(certificates.userId, userId), inArray(certificates.courseId, courseIds))),
    ])
    return {
      enrolled: new Set(enrolled.map((row) => row.courseId)),
      started: new Set(started.flatMap((row) => (row.courseId ? [row.courseId] : []))),
      completed: new Set(completed.map((row) => row.courseId)),
      certified: new Set(certified.map((row) => row.courseId)),
    }
  }

  /** Cursos (de qualquer trilha) em que o aluno tem certificado, entre os informados. */
  async listCertifiedCourseIds(userId: string, courseIds: string[]): Promise<Set<string>> {
    if (courseIds.length === 0) return new Set()
    const certified = await this.db
      .select({ courseId: certificates.courseId })
      .from(certificates)
      .where(and(eq(certificates.userId, userId), inArray(certificates.courseId, courseIds)))
    return new Set(certified.map((row) => row.courseId))
  }

  /** Insere a trilha. Slug repetido lança o erro de unicidade do Postgres. */
  async create(values: TrackInsert, executor: DbExecutor = this.db): Promise<TrackRow> {
    return requireRow(await executor.insert(tracks).values(values).returning(), "tracks")
  }

  /** Atualiza os campos enviados; `undefined` quando a trilha não existe. */
  async update(id: string, patch: Partial<TrackInsert>, executor: DbExecutor = this.db): Promise<TrackRow | undefined> {
    const [track] = await executor.update(tracks).set({ ...patch, updatedAt: sql`now()` }).where(eq(tracks.id, id)).returning()
    return track
  }

  /** Substitui a sequência de cursos da trilha (posição = índice + 1). */
  async replaceCourses(trackId: string, courseIds: string[], executor: DbExecutor = this.db): Promise<void> {
    await executor.delete(trackCourses).where(eq(trackCourses.trackId, trackId))
    if (courseIds.length === 0) return
    await executor.insert(trackCourses).values(courseIds.map((courseId, index) => ({ trackId, courseId, position: index + 1 })))
  }

  /** Apaga a trilha (os vínculos e certificados de trilha saem em cascata; os cursos ficam). */
  async delete(id: string): Promise<void> {
    await this.db.delete(tracks).where(eq(tracks.id, id))
  }

  /** Certificado de trilha do aluno, ou `undefined`. */
  async findCertificate(userId: string, trackId: string): Promise<TrackCertificateRow | undefined> {
    const [certificate] = await this.db
      .select()
      .from(trackCertificates)
      .where(and(eq(trackCertificates.userId, userId), eq(trackCertificates.trackId, trackId)))
    return certificate
  }

  /** Certificados de trilha do aluno, com os títulos. */
  listCertificates(userId: string): Promise<TrackCertificateSummaryRow[]> {
    return this.db
      .select({
        id: trackCertificates.id,
        userId: trackCertificates.userId,
        trackId: trackCertificates.trackId,
        verificationCode: trackCertificates.verificationCode,
        issuedAt: trackCertificates.issuedAt,
        trackTitle: tracks.title,
        certificateTitle: tracks.certificateTitle,
      })
      .from(trackCertificates)
      .innerJoin(tracks, eq(tracks.id, trackCertificates.trackId))
      .where(eq(trackCertificates.userId, userId))
      .orderBy(asc(trackCertificates.issuedAt))
  }

  /**
   * Emite o certificado de trilha. Em conflito (código repetido ou já emitido para o par
   * aluno+trilha) não insere e devolve null — o service decide o que fazer.
   */
  async createCertificate(userId: string, trackId: string, verificationCode: string): Promise<TrackCertificateRow | null> {
    const [inserted] = await this.db.insert(trackCertificates).values({ userId, trackId, verificationCode }).onConflictDoNothing().returning()
    return inserted ?? null
  }
}
