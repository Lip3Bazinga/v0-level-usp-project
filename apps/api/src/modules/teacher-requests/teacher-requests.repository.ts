import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { profiles, teacherApprovals, type TeacherApprovalInsert } from "@levelusp/db"
import type { TeacherApprovalStatus } from "@levelusp/contracts"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { DbTransaction, DbExecutor, TeacherApprovalRow } from "@levelusp/db"

export type ApprovalStatusFilter = TeacherApprovalStatus | "all"

export interface ApprovalReview {
  status: "approved" | "rejected"
  reviewedBy: string
  reviewNote: string | null
}

@Injectable()
export class TeacherRequestsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  async create(approval: TeacherApprovalInsert): Promise<TeacherApprovalRow> {
    return requireRow(await this.db.insert(teacherApprovals).values(approval).returning(), "teacher_approvals")
  }

  findLatest(userId: string): Promise<TeacherApprovalRow | undefined> {
    return this.db.query.teacherApprovals.findFirst({
      where: eq(teacherApprovals.userId, userId),
      orderBy: [desc(teacherApprovals.submittedAt), desc(teacherApprovals.createdAt)],
    })
  }

  /** Pendentes em ordem de chegada (fila); as demais, mais recentes primeiro. */
  list(status: ApprovalStatusFilter): Promise<TeacherApprovalRow[]> {
    return this.db
      .select()
      .from(teacherApprovals)
      .where(status === "all" ? undefined : eq(teacherApprovals.status, status))
      .orderBy(status === "pending" ? asc(teacherApprovals.submittedAt) : desc(teacherApprovals.submittedAt))
  }

  async lock(id: string, tx: DbTransaction): Promise<TeacherApprovalRow | undefined> {
    const [approval] = await tx.select().from(teacherApprovals).where(eq(teacherApprovals.id, id)).for("update")
    return approval
  }

  /** Só revisa se ainda estiver pendente (a checagem acompanha o UPDATE). */
  async review(id: string, review: ApprovalReview, executor: DbExecutor): Promise<TeacherApprovalRow | undefined> {
    const [approval] = await executor
      .update(teacherApprovals)
      .set({ ...review, reviewedAt: sql`now()` })
      .where(and(eq(teacherApprovals.id, id), eq(teacherApprovals.status, "pending")))
      .returning()
    return approval
  }

  /** Promove a professor sem rebaixar quem já é admin. */
  async promoteToTeacher(userId: string, executor: DbExecutor): Promise<void> {
    await executor.update(profiles).set({ role: "teacher" }).where(and(eq(profiles.id, userId), eq(profiles.role, "student")))
  }
}
