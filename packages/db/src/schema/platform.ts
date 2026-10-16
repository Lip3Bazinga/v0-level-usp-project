import { sql } from "drizzle-orm"
import { boolean, check, index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"
import { createdAt, id, tstz, updatedAt } from "./_helpers"

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    kind: text("kind", { enum: ["info", "success", "warning", "danger"] }).notNull().default("info"),
    read: boolean("read").notNull().default(false),
    href: text("href"),
    createdAt: createdAt(),
  },
  (t) => [
    check("notifications_kind_check", sql`${t.kind} in ('info','success','warning','danger')`),
    index("notifications_user_unread_idx").on(t.userId, t.read, t.createdAt),
  ],
)

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull().default(""),
    action: text("action").notNull(),
    target: text("target").notNull().default(""),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    severity: text("severity", { enum: ["info", "warning", "danger"] }).notNull().default("info"),
    createdAt: createdAt(),
  },
  (t) => [
    check("audit_log_severity_check", sql`${t.severity} in ('info','warning','danger')`),
    index("audit_log_created_idx").on(t.createdAt),
  ],
)

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(null),
  updatedAt: updatedAt(),
})

export const teacherApprovals = pgTable(
  "teacher_approvals",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    institution: text("institution").notNull().default(""),
    motivation: text("motivation").notNull().default(""),
    status: text("status", { enum: ["pending", "approved", "rejected", "superseded"] }).notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewNote: text("review_note"),
    submittedAt: tstz("submitted_at").notNull().defaultNow(),
    reviewedAt: tstz("reviewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("teacher_approvals_status_check", sql`${t.status} in ('pending','approved','rejected','superseded')`),
    uniqueIndex("teacher_approvals_um_pendente_por_usuario").on(t.userId).where(sql`${t.status} = 'pending'`),
  ],
)

export const libraryCatalog = pgTable(
  "library_catalog",
  {
    id: id(),
    name: text("name").notNull().unique(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    category: text("category").notNull().default("general"),
    pyodideNative: boolean("pyodide_native").notNull().default(false),
    active: boolean("active").notNull().default(true),
    addedBy: uuid("added_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_library_catalog_active").on(t.active)],
)

export const libraryRequests = pgTable(
  "library_requests",
  {
    id: id(),
    requestedBy: uuid("requested_by").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    libraryName: text("library_name").notNull(),
    displayName: text("display_name"),
    description: text("description"),
    useCase: text("use_case"),
    status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewNotes: text("review_notes"),
    createdAt: createdAt(),
    reviewedAt: tstz("reviewed_at"),
  },
  (t) => [index("idx_library_requests_status").on(t.status), index("idx_library_requests_user").on(t.requestedBy)],
)

/** Imagens enviadas (capas, avatares): dono de cada arquivo em /data/uploads. */
export const uploads = pgTable(
  "uploads",
  {
    name: text("name").primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    bytes: integer("bytes").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("uploads_owner_idx").on(t.ownerId, t.createdAt)],
)
