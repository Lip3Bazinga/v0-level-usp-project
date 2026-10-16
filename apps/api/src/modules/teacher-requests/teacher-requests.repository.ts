import { Injectable } from "@nestjs/common"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { profiles, teacherApprovals } from "@levelusp/db"
import type { TeacherApproval } from "@levelusp/contracts"
import { InjectDb, type Database, type DbOrTx, type Tx } from "@/infra/database/database.module"

type ApprovalRow = typeof teacherApprovals.$inferSelect
export type ApprovalStatus = ApprovalRow["status"]

export function toTeacherApproval(r: ApprovalRow): TeacherApproval {
  return {
    id: r.id, user_id: r.userId, name: r.name, email: r.email, institution: r.institution, motivation: r.motivation,
    status: r.status, reviewed_by: r.reviewedBy, review_note: r.reviewNote, submitted_at: r.submittedAt,
    reviewed_at: r.reviewedAt, created_at: r.createdAt, updated_at: r.updatedAt,
  }
}

@Injectable()
export class TeacherRequestsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  async insert(v: typeof teacherApprovals.$inferInsert) {
    const [row] = await this.db.insert(teacherApprovals).values(v).returning()
    return row!
  }

  latestFor(userId: string) {
    return this.db.query.teacherApprovals.findFirst({
      where: eq(teacherApprovals.userId, userId),
      orderBy: [desc(teacherApprovals.submittedAt), desc(teacherApprovals.createdAt)],
    })
  }

  list(status: ApprovalStatus | "all") {
    return this.db
      .select()
      .from(teacherApprovals)
      .where(status === "all" ? undefined : eq(teacherApprovals.status, status))
      .orderBy(status === "pending" ? asc(teacherApprovals.submittedAt) : desc(teacherApprovals.submittedAt))
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn)
  }

  async lock(tx: DbOrTx, id: string) {
    const [row] = await tx.select().from(teacherApprovals).where(eq(teacherApprovals.id, id)).for("update")
    return row
  }

  async review(tx: DbOrTx, id: string, patch: { status: "approved" | "rejected"; reviewedBy: string; reviewNote: string | null }) {
    const [row] = await tx
      .update(teacherApprovals)
      .set({ ...patch, reviewedAt: sql`now()` })
      .where(and(eq(teacherApprovals.id, id), eq(teacherApprovals.status, "pending")))
      .returning()
    return row
  }

  /** Promove a professor sem rebaixar quem já é admin. */
  promoteToTeacher(tx: DbOrTx, userId: string) {
    return tx.update(profiles).set({ role: "teacher" }).where(and(eq(profiles.id, userId), eq(profiles.role, "student")))
  }
}
