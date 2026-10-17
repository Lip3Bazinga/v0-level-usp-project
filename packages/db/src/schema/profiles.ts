import { sql } from "drizzle-orm"
import { boolean, check, date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { createdAt, updatedAt } from "./_helpers"

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull().default(""),
    username: text("username").unique(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: text("role", { enum: ["student", "teacher", "admin"] }).notNull().default("student"),
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
  (t) => [check("profiles_role_check", sql`${t.role} in ('student','teacher','admin')`)],
)
