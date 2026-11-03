import type {
  ChangePasswordInput, DeleteAccountInput, Profile, RequestPasswordResetInput, ResetPasswordInput, SessionResponse,
  SignInInput, SignUpInput, UpdateMyProfileInput, UploadedImage, UserDataExport,
} from "@levelusp/contracts"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

type OkResponse = { ok: true }

export const signIn = (input: SignInInput) => api.post<SessionResponse>("/auth/sign-in", input)
export const signUp = (input: SignUpInput) => api.post<SessionResponse>("/auth/sign-up", input)
export const signOut = () => api.post<void>("/auth/sign-out")

/** Sessão atual; `null` quando não há usuário logado (401). */
export const fetchSession = () => nullOnStatus(api.get<SessionResponse>("/auth/me"), HTTP_STATUS.UNAUTHORIZED)

export const requestPasswordReset = (email: string) =>
  api.post<OkResponse, RequestPasswordResetInput>("/auth/password/forgot", { email })
export const resetPassword = (token: string, password: string) =>
  api.post<OkResponse, ResetPasswordInput>("/auth/password/reset", { token, password })
export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post<OkResponse, ChangePasswordInput>("/auth/password/change", {
    current_password: currentPassword,
    new_password: newPassword,
  })

export const updateMyProfile = (input: UpdateMyProfileInput) => api.patch<Profile>("/me/profile", input)
export const deleteMyAccount = (password: string) => api.delete<void, DeleteAccountInput>("/me", { password })
export const fetchMyDataExport = () => api.get<UserDataExport>("/me/export")

/** Envia uma imagem (capa de curso, avatar) e devolve a URL pública. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const { url } = await api.post<UploadedImage, FormData>("/uploads/images", form)
  return url
}
