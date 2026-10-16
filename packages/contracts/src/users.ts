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
    avatar_url: z.url().max(2048).nullable(),
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
