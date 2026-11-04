import { sql } from "drizzle-orm"
import { index, integer, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { createdAt, id, timestampTz, updatedAt } from "./_helpers"

/**
 * Credenciais (autenticação própria). Separado de `profiles` (domínio): o que
 * é segredo de login nunca é selecionado junto com dados de perfil.
 */
export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    /** Hash argon2id (ou bcrypt legado do Supabase, re-hasheado no próximo login). */
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestampTz("email_verified_at"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestampTz("locked_until"),
    lastSignInAt: timestampTz("last_sign_in_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("users_email_lower_key").on(sql`lower(${table.email})`)],
)

/** Sessões opacas: o cookie carrega o token; o banco guarda só o SHA-256. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestampTz("expires_at").notNull(),
    lastSeenAt: timestampTz("last_seen_at").notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    revokedAt: timestampTz("revoked_at"),
    createdAt: createdAt(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
)

/** Credencial (`users`), incluindo o hash da senha: nunca serializar para o cliente. */
export type UserRow = typeof users.$inferSelect
/** Sessão de login; o `id` é o SHA-256 do token do cookie, nunca o token. */
export type SessionRow = typeof sessions.$inferSelect

export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestampTz("expires_at").notNull(),
  usedAt: timestampTz("used_at"),
  createdAt: createdAt(),
})

/** Contas OAuth vinculadas (Google/GitHub) — preparado para a próxima fase. */
export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })],
)
