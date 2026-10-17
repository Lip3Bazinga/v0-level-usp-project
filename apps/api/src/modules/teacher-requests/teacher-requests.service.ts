import { Injectable } from "@nestjs/common"
import type { TeacherApproval, TeacherRequestInput } from "@levelusp/contracts"
import type { TeacherApprovalRow } from "@levelusp/db"
import { isUniqueViolation } from "@/common/database/pg-errors"
import { Conflict, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { RATE_LIMITS } from "@/common/rate-limit/rate-limit.policies"
import { RateLimitService } from "@/common/rate-limit/rate-limit.service"
import { TransactionRunner, type Tx } from "@/infra/database/database.module"
import { AuditService } from "../audit/audit.service"
import { NotificationsService } from "../notifications/notifications.service"
import { toTeacherApproval } from "./teacher-requests.mapper"
import { type ApprovalReview, type ApprovalStatusFilter, TeacherRequestsRepository } from "./teacher-requests.repository"

const PENDING_REQUEST_MESSAGE = "Você já tem uma solicitação em análise. Aguarde a resposta da coordenação."
const ALREADY_REVIEWED = () => Conflict("Esta solicitação já foi revisada.", "ALREADY_REVIEWED")

@Injectable()
export class TeacherRequestsService {
  constructor(
    private readonly repo: TeacherRequestsRepository,
    private readonly transactions: TransactionRunner,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async submit(user: AuthUser, input: TeacherRequestInput): Promise<TeacherApproval> {
    if (user.role !== "student") throw Conflict("Sua conta já tem acesso de professor.", "ALREADY_TEACHER")
    this.rateLimit.consume(RATE_LIMITS.teacherRequest, user.id)
    try {
      const approval = await this.repo.insert({
        userId: user.id,
        name: user.fullName,
        email: user.email,
        institution: input.institution,
        motivation: input.motivation,
      })
      return toTeacherApproval(approval)
    } catch (error) {
      // Índice único parcial do banco: no máximo uma pendente por usuário.
      if (isUniqueViolation(error)) throw Conflict(PENDING_REQUEST_MESSAGE, "REQUEST_PENDING")
      throw error
    }
  }

  async mine(user: AuthUser): Promise<TeacherApproval | null> {
    const approval = await this.repo.findLatest(user.id)
    return approval ? toTeacherApproval(approval) : null
  }

  async list(status: ApprovalStatusFilter): Promise<TeacherApproval[]> {
    return (await this.repo.list(status)).map(toTeacherApproval)
  }

  async approve(actor: AuthUser, id: string, note?: string): Promise<void> {
    const approval = await this.transactions.run(async (tx) => {
      const reviewed = await this.reviewPending(id, { status: "approved", reviewedBy: actor.id, reviewNote: note ?? null }, tx)
      await this.repo.promoteToTeacher(reviewed.userId, tx)
      await this.notifications.notify(
        reviewed.userId,
        { title: "Você agora é professor(a)!", body: note ?? "Sua solicitação foi aprovada. O painel do professor já está liberado.", kind: "success", href: "/professor" },
        tx,
      )
      return reviewed
    })
    await this.audit.log(actor, "teacher.approve", approval.email, { approval_id: id, user_id: approval.userId }, "warning")
  }

  async reject(actor: AuthUser, id: string, note?: string): Promise<void> {
    const approval = await this.transactions.run(async (tx) => {
      const reviewed = await this.reviewPending(id, { status: "rejected", reviewedBy: actor.id, reviewNote: note ?? null }, tx)
      await this.notifications.notify(
        reviewed.userId,
        { title: "Solicitação de professor não aprovada", body: note ?? "Sua solicitação foi analisada e não foi aprovada.", kind: "warning" },
        tx,
      )
      return reviewed
    })
    await this.audit.log(actor, "teacher.reject", approval.email, { approval_id: id, user_id: approval.userId })
  }

  private async reviewPending(id: string, review: ApprovalReview, tx: Tx): Promise<TeacherApprovalRow> {
    const current = await this.repo.lock(id, tx)
    if (!current) throw NotFound("Solicitação")
    if (current.status !== "pending") throw ALREADY_REVIEWED()
    const reviewed = await this.repo.review(id, review, tx)
    if (!reviewed) throw ALREADY_REVIEWED()
    return reviewed
  }
}
