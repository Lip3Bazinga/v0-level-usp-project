import { Injectable } from "@nestjs/common"
import type { TeacherApproval, TeacherRequestInput } from "@levelusp/contracts"
import { Conflict, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { AuditService } from "../audit/audit.service"
import { isUniqueViolation } from "../admin/pg-errors"
import type { Tx } from "@/infra/database/database.module"
import { NotificationsService } from "../notifications/notifications.service"
import { type ApprovalStatus, TeacherRequestsRepository, toTeacherApproval } from "./teacher-requests.repository"

const PENDING_MSG = "Você já tem uma solicitação em análise. Aguarde a resposta da coordenação."

@Injectable()
export class TeacherRequestsService {
  constructor(
    private readonly repo: TeacherRequestsRepository,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async submit(user: AuthUser, input: TeacherRequestInput): Promise<TeacherApproval> {
    if (user.role !== "student") throw Conflict("Sua conta já tem acesso de professor.", "ALREADY_TEACHER")
    this.rateLimit.consume(`teacher.request:${user.id}`, 5, 60 * 60_000, "Muitas solicitações seguidas. Tente mais tarde.")
    try {
      const row = await this.repo.insert({
        userId: user.id,
        name: user.fullName,
        email: user.email,
        institution: input.institution,
        motivation: input.motivation,
      })
      return toTeacherApproval(row)
    } catch (err) {
      // Índice único parcial do banco: no máximo uma pendente por usuário.
      if (isUniqueViolation(err)) throw Conflict(PENDING_MSG, "REQUEST_PENDING")
      throw err
    }
  }

  async mine(user: AuthUser): Promise<TeacherApproval | null> {
    const row = await this.repo.latestFor(user.id)
    return row ? toTeacherApproval(row) : null
  }

  async list(status: ApprovalStatus | "all"): Promise<TeacherApproval[]> {
    return (await this.repo.list(status)).map(toTeacherApproval)
  }

  async approve(actor: AuthUser, id: string, note?: string): Promise<void> {
    const approval = await this.repo.transaction(async (tx) => {
      const row = await this.reviewPending(tx, actor, id, "approved", note)
      await this.repo.promoteToTeacher(tx, row.userId)
      await this.notifications.notify(
        row.userId,
        { title: "Você agora é professor(a)!", body: note ?? "Sua solicitação foi aprovada. O painel do professor já está liberado.", kind: "success", href: "/professor" },
        tx,
      )
      return row
    })
    await this.audit.log(actor, "teacher.approve", approval.email, { approval_id: id, user_id: approval.userId }, "warning")
  }

  async reject(actor: AuthUser, id: string, note?: string): Promise<void> {
    const approval = await this.repo.transaction(async (tx) => {
      const row = await this.reviewPending(tx, actor, id, "rejected", note)
      await this.notifications.notify(
        row.userId,
        { title: "Solicitação de professor não aprovada", body: note ?? "Sua solicitação foi analisada e não foi aprovada.", kind: "warning" },
        tx,
      )
      return row
    })
    await this.audit.log(actor, "teacher.reject", approval.email, { approval_id: id, user_id: approval.userId })
  }

  private async reviewPending(tx: Tx, actor: AuthUser, id: string, status: "approved" | "rejected", note?: string) {
    const current = await this.repo.lock(tx, id)
    if (!current) throw NotFound("Solicitação")
    if (current.status !== "pending") throw Conflict("Esta solicitação já foi revisada.", "ALREADY_REVIEWED")
    const row = await this.repo.review(tx, id, { status, reviewedBy: actor.id, reviewNote: note ?? null })
    if (!row) throw Conflict("Esta solicitação já foi revisada.", "ALREADY_REVIEWED")
    return row
  }
}
