import type { Profile, SessionResponse, SignInInput, SignUpInput, UpdateMyProfileInput, UserDataExport } from "@levelusp/contracts"
import { api, ApiError } from "./client"

export function signIn(input: SignInInput) {
  return api.post<SessionResponse>("/auth/sign-in", input)
}

export function signUp(input: SignUpInput) {
  return api.post<SessionResponse>("/auth/sign-up", input)
}

export function signOut() {
  return api.post<void>("/auth/sign-out")
}

/** Sessão atual ou null (401 = deslogado). */
export async function fetchSession(): Promise<SessionResponse | null> {
  try {
    return await api.get<SessionResponse>("/auth/me")
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export function requestPasswordReset(email: string) {
  return api.post<{ ok: true }>("/auth/password/forgot", { email })
}

export function resetPassword(token: string, password: string) {
  return api.post<{ ok: true }>("/auth/password/reset", { token, password })
}

export function changePassword(current_password: string, new_password: string) {
  return api.post<{ ok: true }>("/auth/password/change", { current_password, new_password })
}

export function updateMyProfile(input: UpdateMyProfileInput) {
  return api.patch<Profile>("/me/profile", input)
}

export function deleteMyAccount(password: string) {
  return api.delete<void>("/me", { password })
}

export function exportMyData() {
  return api.get<UserDataExport>("/me/export")
}

/** Envia uma imagem (capa/avatar) e devolve a URL pública. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const { url } = await api.post<{ url: string }>("/uploads/images", form)
  return url
}
