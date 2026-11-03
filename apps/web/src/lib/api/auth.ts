import type {
  ChangePasswordInput, DeleteAccountInput, OkResponse, Profile, RequestPasswordResetInput, ResetPasswordInput, SessionResponse,
  SignInInput, SignUpInput, UpdateMyProfileInput, UploadedImage, UserDataExport,
} from "@levelusp/contracts"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

export const signIn = (input: SignInInput): Promise<SessionResponse> => api.post<SessionResponse>("/auth/sign-in", input)
export const signUp = (input: SignUpInput): Promise<SessionResponse> => api.post<SessionResponse>("/auth/sign-up", input)
export const signOut = (): Promise<void> => api.post<void>("/auth/sign-out")

/** Sessão atual; `null` quando não há usuário logado (401). */
export const fetchSession = (): Promise<SessionResponse | null> => nullOnStatus(api.get<SessionResponse>("/auth/me"), HTTP_STATUS.UNAUTHORIZED)

export const requestPasswordReset = (email: string): Promise<OkResponse> =>
  api.post<OkResponse, RequestPasswordResetInput>("/auth/password/forgot", { email })
export const resetPassword = (token: string, password: string): Promise<OkResponse> =>
  api.post<OkResponse, ResetPasswordInput>("/auth/password/reset", { token, password })
export const changePassword = (currentPassword: string, newPassword: string): Promise<OkResponse> =>
  api.post<OkResponse, ChangePasswordInput>("/auth/password/change", {
    current_password: currentPassword,
    new_password: newPassword,
  })

export const updateMyProfile = (input: UpdateMyProfileInput): Promise<Profile> => api.patch<Profile>("/me/profile", input)
export const deleteMyAccount = (password: string): Promise<void> => api.delete<void, DeleteAccountInput>("/me", { password })
export const fetchMyDataExport = (): Promise<UserDataExport> => api.get<UserDataExport>("/me/export")

/** Envia uma imagem (capa de curso, avatar) e devolve a URL pública. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const { url } = await api.post<UploadedImage, FormData>("/uploads/images", form)
  return url
}
