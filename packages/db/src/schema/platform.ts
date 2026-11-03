import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import {
  AUDIT_SEVERITIES, LIBRARY_CATEGORIES, LIBRARY_REQUEST_STATUSES, NOTIFICATION_KINDS, TEACHER_APPROVAL_STATUSES,
} from "@levelusp/contracts"
import { profiles } from "./profiles"
import { createdAt, id, isOneOf, timestampTz, updatedAt } from "./_helpers"

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull().default("info"),
    read: boolean("read").notNull().default(false),
    href: text("href"),
    createdAt: createdAt(),
  },
  (table) => [
    check("notifications_kind_check", isOneOf(table.kind, NOTIFICATION_KINDS)),
    index("notifications_user_unread_idx").on(table.userId, table.read, table.createdAt),
  ],
)

export type NotificationRow = typeof notifications.$inferSelect
export type NotificationInsert = typeof notifications.$inferInsert

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull().default(""),
    action: text("action").notNull(),
    target: text("target").notNull().default(""),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    severity: text("severity", { enum: AUDIT_SEVERITIES }).notNull().default("info"),
    createdAt: createdAt(),
  },
  (table) => [
    check("audit_log_severity_check", isOneOf(table.severity, AUDIT_SEVERITIES)),
    index("audit_log_created_idx").on(table.createdAt),
  ],
)

export type AuditLogRow = typeof auditLog.$inferSelect

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(null),
  updatedAt: updatedAt(),
})

export type PlatformSettingRow = typeof platformSettings.$inferSelect

export const teacherApprovals = pgTable(
  "teacher_approvals",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    institution: text("institution").notNull().default(""),
    motivation: text("motivation").notNull().default(""),
    status: text("status", { enum: TEACHER_APPROVAL_STATUSES }).notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewNote: text("review_note"),
    submittedAt: timestampTz("submitted_at").notNull().defaultNow(),
    reviewedAt: timestampTz("reviewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("teacher_approvals_status_check", isOneOf(table.status, TEACHER_APPROVAL_STATUSES)),
    uniqueIndex("teacher_approvals_um_pendente_por_usuario").on(table.userId).where(sql`${table.status} = 'pending'`),
  ],
)

export type TeacherApprovalRow = typeof teacherApprovals.$inferSelect
export type TeacherApprovalInsert = typeof teacherApprovals.$inferInsert

export const libraryCatalog = pgTable(
  "library_catalog",
  {
    id: id(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    category: text("category", { enum: LIBRARY_CATEGORIES }).notNull().default("general"),
    pyodideNative: boolean("pyodide_native").notNull().default(false),
    active: boolean("active").notNull().default(true),
    addedBy: uuid("added_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [index("idx_library_catalog_active").on(table.active)],
)

export type LibraryCatalogRow = typeof libraryCatalog.$inferSelect
export type LibraryCatalogInsert = typeof libraryCatalog.$inferInsert

export const libraryRequests = pgTable(
  "library_requests",
  {
    id: id(),
    requestedBy: uuid("requested_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    libraryName: text("library_name").notNull(),
    displayName: text("display_name"),
    description: text("description"),
    useCase: text("use_case"),
    status: text("status", { enum: LIBRARY_REQUEST_STATUSES }).notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewNotes: text("review_notes"),
    createdAt: createdAt(),
    reviewedAt: timestampTz("reviewed_at"),
  },
  (table) => [index("idx_library_requests_status").on(table.status), index("idx_library_requests_user").on(table.requestedBy)],
)

export type LibraryRequestRow = typeof libraryRequests.$inferSelect
export type LibraryRequestInsert = typeof libraryRequests.$inferInsert

/** Imagens enviadas (capas, avatares): dono de cada arquivo em /data/uploads. */
export const uploads = pgTable(
  "uploads",
  {
    name: text("name").primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    bytes: integer("bytes").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("uploads_owner_idx").on(table.ownerId, table.createdAt)],
)

export type UploadRow = typeof uploads.$inferSelect
