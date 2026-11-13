import { Injectable, Logger } from "@nestjs/common"
import type { Track, TrackCertificate, TrackCertificateIssue, TrackInput, TrackUpdateInput, TrackWithCourses } from "@levelusp/contracts"
import type { DbTransaction, TrackInsert, TrackRow } from "@levelusp/db"
import { isUniqueViolation } from "@/common/database/pg-errors"
import { Conflict, Forbidden, NotFound, ServiceUnavailable, Unprocessable } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { TransactionRunner } from "@/infra/database/database.module"
import { AuditService } from "../audit/audit.service"
import { generateVerificationCode, TRACK_CODE_PREFIX } from "../certificates/certificates.domain"
import { EventsService } from "../experiment/events.service"
import { NotificationsService } from "../notifications/notifications.service"
import { isTrackCertifiable, trackCourseStatus } from "./tracks.domain"
import { toTrack, toTrackCertificate, toTrackCertificateIssue, toTrackCourse } from "./tracks.mapper"
import { TracksRepository } from "./tracks.repository"

const MAX_CODE_RETRIES = 5

/** Entrada (snake_case) → colunas, só com os campos presentes; `course_ids` vai para `track_courses`. */
const TRACK_PATCH: PatchMapping<TrackUpdateInput, TrackInsert> = {
  slug: (slug) => ({ slug }),
  title: (title) => ({ title }),
  description: (description) => ({ description }),
  icon: (icon) => ({ icon }),
  color: (color) => ({ color }),
  sort_order: (sortOrder) => ({ sortOrder }),
  published: (published) => ({ published }),
  certificate_title: (certificateTitle) => ({ certificateTitle }),
  course_ids: () => ({}),
}

/** Trilhas: catálogo com a situação do aluno em cada curso, administração e certificado de trilha. */
@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name)

  constructor(
    private readonly repo: TracksRepository,
    private readonly transactions: TransactionRunner,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsService,
  ) {}

  /** Trilhas publicadas, na ordem de exibição, com a contagem de cursos publicados. */
  async list(): Promise<Track[]> {
    return (await this.repo.list(true)).map(({ track, courseCount }) => toTrack(track, courseCount))
  }

  /** Todas as trilhas (com rascunhos), para a administração. */
  async listAll(): Promise<Track[]> {
    return (await this.repo.list(false)).map(({ track, courseCount }) => toTrack(track, courseCount))
  }

  /**
   * Trilha com os cursos na ordem e a situação do usuário em cada um. Sem sessão, a situação
   * depende só do pré-requisito (`available` ou `locked`). Rascunhos só aparecem para admins.
   *
   * @throws AppError 404 trilha inexistente ou não publicada.
   */
  async getBySlug(user: AuthUser | undefined, slug: string): Promise<TrackWithCourses> {
    const track = await this.repo.findBySlug(slug)
    const isAdmin = user?.role === "admin"
    if (!track || (!track.published && !isAdmin)) throw NotFound("Trilha")
    return this.withCourses(user, track, !isAdmin)
  }

  /**
   * Cria a trilha com a sequência de cursos.
   *
   * @throws AppError 409 `SLUG_TAKEN`; 422 `INVALID_COURSE` quando algum curso não existe.
   */
  async create(actor: AuthUser, input: TrackInput): Promise<TrackWithCourses> {
    await this.assertCoursesExist(input.course_ids)
    const track = await this.guardSlug(() =>
      this.transactions.run(async (tx: DbTransaction) => {
        const created = await this.repo.create({ ...buildPatch(input, TRACK_PATCH), slug: input.slug, title: input.title }, tx)
        await this.repo.replaceCourses(created.id, input.course_ids, tx)
        return created
      }),
    )
    await this.audit.log(actor, "track.create", `track:${track.id}`, { slug: track.slug, courses: input.course_ids.length })
    return this.withCourses(actor, track, false)
  }

  /**
   * Atualiza os campos enviados; `course_ids`, quando vem, substitui a sequência inteira.
   *
   * @throws AppError 404 trilha inexistente; 409 `SLUG_TAKEN`; 422 `INVALID_COURSE`.
   */
  async update(actor: AuthUser, id: string, input: TrackUpdateInput): Promise<TrackWithCourses> {
    const current = await this.repo.findById(id)
    if (!current) throw NotFound("Trilha")
    if (input.course_ids) await this.assertCoursesExist(input.course_ids)
    const patch = buildPatch(input, TRACK_PATCH)
    const track = await this.guardSlug(() =>
      this.transactions.run(async (tx: DbTransaction) => {
        const updated = Object.keys(patch).length ? await this.repo.update(id, patch, tx) : current
        if (updated && input.course_ids) await this.repo.replaceCourses(id, input.course_ids, tx)
        return updated
      }),
    )
    if (!track) throw NotFound("Trilha")
    await this.audit.log(actor, "track.update", `track:${id}`, { fields: Object.keys(input) })
    return this.withCourses(actor, track, false)
  }

  /**
   * Apaga a trilha (os cursos continuam existindo); fica na auditoria.
   *
   * @throws AppError 404 trilha inexistente.
   */
  async delete(actor: AuthUser, id: string): Promise<void> {
    const track = await this.repo.findById(id)
    if (!track) throw NotFound("Trilha")
    await this.repo.delete(id)
    await this.audit.log(actor, "track.delete", `track:${id}`, { slug: track.slug, title: track.title }, "warning")
  }

  /** Certificados de trilha do usuário. */
  async listMyCertificates(user: AuthUser): Promise<TrackCertificate[]> {
    return (await this.repo.listCertificates(user.id)).map(toTrackCertificate)
  }

  /**
   * Emite o certificado da trilha quando TODOS os cursos publicados dela têm certificado. Idempotente.
   *
   * @throws AppError 404 trilha inexistente/não publicada; 422 `NO_COURSES`; 403 `NOT_ELIGIBLE`; 503 sem código único.
   */
  async issueCertificate(user: AuthUser, trackId: string): Promise<TrackCertificateIssue> {
    const track = await this.repo.findById(trackId)
    if (!track?.published) throw NotFound("Trilha")
    const existing = await this.repo.findCertificate(user.id, trackId)
    if (existing) return toTrackCertificateIssue(existing, true)

    const courseIds = (await this.repo.listCourses(trackId, true)).map(({ course }) => course.id)
    if (courseIds.length === 0) throw Unprocessable("Esta trilha ainda não tem cursos publicados.", "NO_COURSES")
    const certified = await this.repo.listCertifiedCourseIds(user.id, courseIds)
    if (!isTrackCertifiable(courseIds, certified)) {
      throw Forbidden(`Faltam ${courseIds.length - certified.size} certificados de curso para concluir a trilha.`, "NOT_ELIGIBLE")
    }

    for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
      const inserted = await this.repo.createCertificate(user.id, trackId, generateVerificationCode(undefined, TRACK_CODE_PREFIX))
      if (inserted) {
        await this.afterIssue(user, track, inserted.verificationCode)
        return toTrackCertificateIssue(inserted, false)
      }
      // Conflito: emissão concorrente do mesmo certificado ou colisão de código.
      const raced = await this.repo.findCertificate(user.id, trackId)
      if (raced) return toTrackCertificateIssue(raced, true)
    }
    this.logger.error({ userId: user.id, trackId }, "não foi possível gerar código de certificado de trilha único")
    throw ServiceUnavailable("Não foi possível emitir o certificado agora. Tente novamente.", "CERTIFICATE_UNAVAILABLE")
  }

  /** Auditoria, evento e notificação: melhor-esforço, nunca derrubam a emissão. */
  private async afterIssue(user: AuthUser, track: TrackRow, code: string): Promise<void> {
    const title = track.certificateTitle || track.title
    await this.audit.log(user, "track_certificate.issued", `track:${track.id}`, { verification_code: code, track_title: title })
    await this.events.record(user.id, "certificate_issued", { track_id: track.id, kind: "track" })
    try {
      await this.notifications.notify(user.id, {
        title: "Certificado da trilha emitido! 🎓",
        body: `Você concluiu a trilha ${title}. O código de verificação do certificado é ${code}.`,
        kind: "success",
        href: `/certificado/${code}`,
      })
    } catch (error) {
      this.logger.warn({ err: error, userId: user.id, trackId: track.id }, "falha ao notificar emissão de certificado de trilha")
    }
  }

  private async withCourses(user: AuthUser | undefined, track: TrackRow, onlyPublished: boolean): Promise<TrackWithCourses> {
    const rows = await this.repo.listCourses(track.id, onlyPublished)
    const courseIds = rows.map(({ course }) => course.id)
    const prerequisiteIds = rows.flatMap(({ course }) => (course.prerequisiteCourseId ? [course.prerequisiteCourseId] : []))
    const standing = user ? await this.repo.findStanding(user.id, courseIds) : null
    // O pré-requisito pode estar fora da trilha: o certificado dele é consultado à parte.
    const certifiedPrerequisites = user ? await this.repo.listCertifiedCourseIds(user.id, prerequisiteIds) : new Set<string>()
    const courses = rows.map((row) => {
      const { id, prerequisiteCourseId } = row.course
      const status = trackCourseStatus({
        enrolled: standing?.enrolled.has(id) ?? false,
        started: standing?.started.has(id) ?? false,
        completed: standing?.completed.has(id) ?? false,
        certified: standing?.certified.has(id) ?? false,
        prerequisiteCertified: prerequisiteCourseId === null || certifiedPrerequisites.has(prerequisiteCourseId),
      })
      return toTrackCourse(row, status, standing?.enrolled.has(id))
    })
    return { ...toTrack(track), courses }
  }

  private async assertCoursesExist(courseIds: string[]): Promise<void> {
    const existing = await this.repo.listExistingCourseIds(courseIds)
    if (courseIds.some((id) => !existing.has(id))) throw Unprocessable("Algum curso da trilha não existe.", "INVALID_COURSE")
  }

  /** Slug repetido (índice único) vira 409 com mensagem para o admin. */
  private async guardSlug<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work()
    } catch (error) {
      if (isUniqueViolation(error)) throw Conflict("Já existe uma trilha com este slug.", "SLUG_TAKEN")
      throw error
    }
  }
}
