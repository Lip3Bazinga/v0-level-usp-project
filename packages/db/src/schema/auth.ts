import { sql } from "drizzle-orm"
import { index, integer, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { createdAt, id, tstz, updatedAt } from "./_helpers"

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
    emailVerifiedAt: tstz("email_verified_at"),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: tstz("locked_until"),
    lastSignInAt: tstz("last_sign_in_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_email_lower_key").on(sql`lower(${t.email})`)],
)

/** Sessões opacas: o cookie carrega o token; o banco guarda só o SHA-256. */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: tstz("expires_at").notNull(),
    lastSeenAt: tstz("last_seen_at").notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    revokedAt: tstz("revoked_at"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
)

export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: tstz("expires_at").notNull(),
  usedAt: tstz("used_at"),
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
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
)
