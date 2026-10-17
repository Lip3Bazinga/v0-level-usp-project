import { sql } from "drizzle-orm"
import { boolean, check, integer, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core"
import { profiles } from "./profiles"
import { createdAt, tstz } from "./_helpers"

export const badges = pgTable(
  "badges",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("Award"),
    rarity: text("rarity", { enum: ["common", "rare", "epic", "legendary"] }).notNull().default("common"),
    criteriaType: text("criteria_type", {
      enum: ["total_xp", "current_streak", "max_streak", "lessons_completed", "courses_completed", "manual"],
    }).notNull(),
    criteriaValue: integer("criteria_value").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check("badges_rarity_check", sql`${t.rarity} in ('common','rare','epic','legendary')`),
    check(
      "badges_criteria_type_check",
      sql`${t.criteriaType} in ('total_xp','current_streak','max_streak','lessons_completed','courses_completed','manual')`,
    ),
  ],
)

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: tstz("earned_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
)
