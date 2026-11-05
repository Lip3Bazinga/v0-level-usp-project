import { boolean, integer, pgTable, primaryKey, text, unique, uuid } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"
import { courses } from "./content"
import { createdAt, id, timestampTz, updatedAt } from "./_helpers"

/** Trilha: sequência ordenada de cursos (níveis); certificar todos dá o certificado da trilha. */
export const tracks = pgTable("tracks", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("BookOpen"),
  color: text("color").notNull().default("bg-level-purple"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(false),
  /** Nome impresso no certificado da trilha. */
  certificateTitle: text("certificate_title").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** Linha de `tracks`. */
export type TrackRow = typeof tracks.$inferSelect
/** Valores para inserir ou atualizar em `tracks`. */
export type TrackInsert = typeof tracks.$inferInsert

/** Cursos de uma trilha, na ordem (`position` a partir de 1). */
export const trackCourses = pgTable(
  "track_courses",
  {
    trackId: uuid("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.trackId, table.courseId] }),
    unique("track_courses_track_id_position_key").on(table.trackId, table.position),
  ],
)

/** Vínculo curso ↔ trilha com a posição. */
export type TrackCourseRow = typeof trackCourses.$inferSelect
/** Valores para inserir em `track_courses`. */
export type TrackCourseInsert = typeof trackCourses.$inferInsert

/** Certificado de trilha: emitido quando todos os cursos da trilha estão certificados. */
export const trackCertificates = pgTable(
  "track_certificates",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    trackId: uuid("track_id").notNull().references(() => tracks.id, { onDelete: "cascade" }),
    verificationCode: text("verification_code").notNull().unique(),
    issuedAt: timestampTz("issued_at").notNull().defaultNow(),
  },
  (table) => [unique("track_certificates_user_id_track_id_key").on(table.userId, table.trackId)],
)

/** Certificado de trilha emitido; `verificationCode` é o código público da verificação. */
export type TrackCertificateRow = typeof trackCertificates.$inferSelect
/** Valores para emitir um certificado de trilha. */
export type TrackCertificateInsert = typeof trackCertificates.$inferInsert
