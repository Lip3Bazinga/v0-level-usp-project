import { boolean, check, integer, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core"
import { BADGE_CRITERIA_TYPES, BADGE_RARITIES } from "@levelusp/contracts"
import { profiles } from "./profiles"
import { createdAt, isOneOf, timestampTz } from "./_helpers"

export const badges = pgTable(
  "badges",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("Award"),
    rarity: text("rarity", { enum: BADGE_RARITIES }).notNull().default("common"),
    criteriaType: text("criteria_type", { enum: BADGE_CRITERIA_TYPES }).notNull(),
    criteriaValue: integer("criteria_value").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    check("badges_rarity_check", isOneOf(table.rarity, BADGE_RARITIES)),
    check("badges_criteria_type_check", isOneOf(table.criteriaType, BADGE_CRITERIA_TYPES)),
  ],
)

export type BadgeRow = typeof badges.$inferSelect
export type BadgeInsert = typeof badges.$inferInsert

export const userBadges = pgTable(
  "user_badges",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestampTz("earned_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.badgeId] })],
)

export type UserBadgeRow = typeof userBadges.$inferSelect
