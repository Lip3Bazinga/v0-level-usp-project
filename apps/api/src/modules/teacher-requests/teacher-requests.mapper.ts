import type { TeacherApproval } from "@levelusp/contracts"
import type { TeacherApprovalRow } from "@levelusp/db"

/** Solicitação no formato do contrato. */
export function toTeacherApproval(approval: TeacherApprovalRow): TeacherApproval {
  return {
    id: approval.id,
    user_id: approval.userId,
    name: approval.name,
    email: approval.email,
    institution: approval.institution,
    motivation: approval.motivation,
    status: approval.status,
    reviewed_by: approval.reviewedBy,
    review_note: approval.reviewNote,
    submitted_at: approval.submittedAt,
    reviewed_at: approval.reviewedAt,
    created_at: approval.createdAt,
    updated_at: approval.updatedAt,
  }
}
