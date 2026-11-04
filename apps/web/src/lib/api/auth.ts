import type {
  ChangePasswordInput, DeleteAccountInput, OkResponse, Profile, RequestPasswordResetInput, ResetPasswordInput, SessionResponse,
  SignInInput, SignUpInput, UpdateMyProfileInput, UploadedImage, UserDataExport,
} from "@levelusp/contracts"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

/** Entra com e-mail e senha; a API grava o cookie de sessão. */
export const signIn = (input: SignInInput): Promise<SessionResponse> => api.post<SessionResponse>("/auth/sign-in", input)
/** Cria a conta e já entra (cookie de sessão gravado pela API). */
export const signUp = (input: SignUpInput): Promise<SessionResponse> => api.post<SessionResponse>("/auth/sign-up", input)
/** Encerra a sessão atual. */
export const signOut = (): Promise<void> => api.post<void>("/auth/sign-out")

/** Sessão atual; `null` quando não há usuário logado (401). */
export const fetchSession = (): Promise<SessionResponse | null> => nullOnStatus(api.get<SessionResponse>("/auth/me"), HTTP_STATUS.UNAUTHORIZED)

/** Pede o link de redefinição; a resposta é a mesma exista ou não a conta. */
export const requestPasswordReset = (email: string): Promise<OkResponse> =>
  api.post<OkResponse, RequestPasswordResetInput>("/auth/password/forgot", { email })
/** Define a nova senha pelo token do link; todas as sessões são encerradas. */
export const resetPassword = (token: string, password: string): Promise<OkResponse> =>
  api.post<OkResponse, ResetPasswordInput>("/auth/password/reset", { token, password })
/** Troca a senha confirmando a atual; as outras sessões são encerradas. */
export const changePassword = (currentPassword: string, newPassword: string): Promise<OkResponse> =>
  api.post<OkResponse, ChangePasswordInput>("/auth/password/change", {
    current_password: currentPassword,
    new_password: newPassword,
  })

/** Atualiza os campos enviados do próprio perfil. */
export const updateMyProfile = (input: UpdateMyProfileInput): Promise<Profile> => api.patch<Profile>("/me/profile", input)
/** Exclui a própria conta (LGPD), confirmando a senha. */
export const deleteMyAccount = (password: string): Promise<void> => api.delete<void, DeleteAccountInput>("/me", { password })
/** Todos os dados pessoais do usuário (LGPD), para download. */
export const fetchMyDataExport = (): Promise<UserDataExport> => api.get<UserDataExport>("/me/export")

/** Envia uma imagem (capa de curso, avatar) e devolve a URL pública. */
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append("file", file)
  const { url } = await api.post<UploadedImage, FormData>("/uploads/images", form)
  return url
}
