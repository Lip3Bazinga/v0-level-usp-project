import { z } from "zod"
import { MAX_FULL_NAME_LENGTH, type Profile } from "./users"

const MAX_EMAIL_LENGTH = 254
const MIN_PASSWORD_LENGTH = 10
const MAX_PASSWORD_LENGTH = 128

export const emailSchema = z.email("E-mail inválido").trim().toLowerCase().max(MAX_EMAIL_LENGTH)

/** Política de senha: 10+ caracteres, com letra e número. */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`)
  .max(MAX_PASSWORD_LENGTH, `A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} caracteres`)
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra")
  .regex(/[0-9]/, "Inclua ao menos um número")

/** Senha já cadastrada: só limita o tamanho (a política vale para senhas novas). */
const currentPasswordSchema = z.string().min(1).max(MAX_PASSWORD_LENGTH)

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().trim().min(1, "Informe seu nome").max(MAX_FULL_NAME_LENGTH),
})
/** Corpo de `POST /auth/sign-up`: e-mail normalizado (minúsculo), senha pela política e nome. */
export type SignUpInput = z.infer<typeof signUpSchema>

export const signInSchema = z.object({
  email: emailSchema,
  password: currentPasswordSchema,
})
/** Corpo de `POST /auth/sign-in`. A senha só tem limite de tamanho: a política vale para senhas novas. */
export type SignInInput = z.infer<typeof signInSchema>

export const requestPasswordResetSchema = z.object({ email: emailSchema })
/** Corpo de `POST /auth/password/forgot`; a resposta é a mesma exista ou não a conta. */
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: passwordSchema,
})
/** Corpo de `POST /auth/password/reset`: token do link (uso único) e a nova senha. */
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const changePasswordSchema = z.object({
  current_password: currentPasswordSchema,
  new_password: passwordSchema,
})
/** Corpo de `POST /auth/password/change`: exige a senha atual; as outras sessões são revogadas. */
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/** Resultado da atualização de sequência diária feita no login. */
export interface StreakResult {
  streak: number
  increased: boolean
  reset: boolean
}

/**
 * Resposta de login, cadastro e `GET /auth/me`. `streak` só vem quando o acesso atualizou a sequência diária.
 */
export interface SessionResponse {
  user: Profile
  streak?: StreakResult
}
