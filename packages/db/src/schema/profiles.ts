import { boolean, check, date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { USER_ROLES } from "@levelusp/contracts"
import { users } from "./auth"
import { createdAt, isOneOf, updatedAt } from "./_helpers"

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull().default(""),
    username: text("username").unique(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: text("role", { enum: USER_ROLES }).notNull().default("student"),
    level: integer("level").notNull().default(1),
    totalXp: integer("total_xp").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    maxStreak: integer("max_streak").notNull().default(0),
    coursesCompleted: integer("courses_completed").notNull().default(0),
    lessonsCompleted: integer("lessons_completed").notNull().default(0),
    lastLoginDate: date("last_login_date", { mode: "string" }),
    suspended: boolean("suspended").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [check("profiles_role_check", isOneOf(table.role, USER_ROLES))],
)

export type ProfileRow = typeof profiles.$inferSelect
export type ProfileInsert = typeof profiles.$inferInsert
