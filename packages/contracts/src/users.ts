import { z } from "zod"

export type UserRole = "student" | "teacher" | "admin"
export const userRoleSchema = z.enum(["student", "teacher", "admin"])

/** Perfil público + gamificação. Mantém snake_case por compatibilidade com o front. */
export interface Profile {
  id: string
  email: string
  full_name: string
  username: string | null
  avatar_url: string | null
  bio: string | null
  role: UserRole
  level: number
  total_xp: number
  current_streak: number
  max_streak: number
  courses_completed: number
  lessons_completed: number
  last_login_date: string | null
  suspended: boolean
  created_at: string
  updated_at: string
}

/** Perfil exposto a terceiros (sem e-mail). */
export type PublicProfile = Omit<Profile, "email" | "suspended">

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Use ao menos 3 caracteres")
  .max(32, "Use no máximo 32 caracteres")
  .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _")

export const updateMyProfileSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120),
    username: usernameSchema,
    bio: z.string().trim().max(500).nullable(),
    /** /api/files/... (enviada pelo próprio usuário) ou https externo — validado na API. */
    avatar_url: z.string().max(2048).nullable(),
  })
  .partial()
export type UpdateMyProfileInput = z.infer<typeof updateMyProfileSchema>

/** Edição administrativa (papel, suspensão, dados básicos). */
export const adminUpdateUserSchema = z
  .object({
    full_name: z.string().trim().min(1).max(120),
    username: usernameSchema,
    role: userRoleSchema,
    suspended: z.boolean(),
    bio: z.string().trim().max(500).nullable(),
  })
  .partial()
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>

/** Exclusão da própria conta (LGPD): exige a senha atual. */
export const deleteAccountSchema = z.object({ password: z.string().min(1, "Informe sua senha").max(128) })
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>

/** Exportação dos dados pessoais (LGPD). Nunca inclui hashes de senha ou tokens. */
export interface UserDataExport {
  exported_at: string
  profile: Profile
  account: { email: string; email_verified_at: string | null; last_sign_in_at: string | null; created_at: string }
  [section: string]: unknown
}
