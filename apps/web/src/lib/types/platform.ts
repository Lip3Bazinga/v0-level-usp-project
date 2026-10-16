export interface TeacherApproval {
  id: string
  user_id: string
  name: string
  email: string
  institution: string
  motivation: string
  status: "pending" | "approved" | "rejected"
  reviewed_by: string | null
  review_note: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_name: string
  action: string
  target: string
  meta: Record<string, unknown> | null
  severity: "info" | "warning" | "danger"
  created_at: string
}

export type NotificationKind = "info" | "success" | "warning" | "danger"

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  kind: NotificationKind
  read: boolean
  href: string | null
  created_at: string
}
