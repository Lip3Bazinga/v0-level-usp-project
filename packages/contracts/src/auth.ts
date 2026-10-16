import { z } from "zod"
import type { Profile } from "./users"

export const emailSchema = z.email("E-mail inválido").trim().toLowerCase().max(254)

/** Política de senha: 10+ caracteres, com letra e número. */
export const passwordSchema = z
  .string()
  .min(10, "A senha precisa ter ao menos 10 caracteres")
  .max(128, "A senha pode ter no máximo 128 caracteres")
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
  .regex(/[0-9]/, "Inclua ao menos um número")

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().trim().min(1, "Informe seu nome").max(120),
})
export type SignUpInput = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
})
export type SignInInput = z.infer<typeof signInSchema>

export const requestPasswordResetSchema = z.object({ email: emailSchema })
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: passwordSchema,
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/** Resultado da atualização de sequência diária feita no login. */
export interface StreakResult {
  streak: number
  increased: boolean
  reset: boolean
}

export interface SessionResponse {
  user: Profile
  streak?: StreakResult
}
