import type {
  Badge, BadgeInput, BadgeUpdateInput, LibraryCatalog, LibraryRequest, LibraryRequestInput, Note, NoteInput,
  NoteUpdateInput, Notification, PublicProfile, ReviewLibraryRequestInput, UserBadge,
} from "@levelusp/contracts"
import type { libraryCatalogToggleSchema } from "@levelusp/contracts"
import type { SchemaInput } from "@/lib/types/schema"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

const LEADERBOARD_SIZE = 50
const NOTIFICATIONS_PAGE_SIZE = 30

/** Ranking de alunos por XP. */
export const fetchLeaderboard = (limit = LEADERBOARD_SIZE): Promise<PublicProfile[]> =>
  api.get<PublicProfile[]>("/leaderboard", { query: { limit } })
/** Perfil público pelo username, ou null se não existe. */
export const fetchProfileByUsername = (username: string): Promise<PublicProfile | null> =>
  nullOnStatus(api.get<PublicProfile>(`/users/by-username/${encodeURIComponent(username)}`), HTTP_STATUS.NOT_FOUND)

/** Catálogo de badges ativos. */
export const fetchBadges = (): Promise<Badge[]> => api.get<Badge[]>("/badges")
/** Inclui badges inativas; só administradores. */
export const fetchAdminBadges = (): Promise<Badge[]> => api.get<Badge[]>("/admin/badges")
/** Badges conquistados pelo usuário. */
export const fetchUserBadges = (userId: string): Promise<UserBadge[]> => api.get<UserBadge[]>(`/users/${userId}/badges`)
/** Cria um badge no catálogo (admin; 409 se o id já existe). */
export const createBadge = (input: BadgeInput): Promise<Badge> => api.post<Badge>("/admin/badges", input)
/** Atualiza os campos enviados do badge (admin). */
export const updateBadge = (badgeId: string, input: BadgeUpdateInput): Promise<Badge> => api.patch<Badge>(`/admin/badges/${badgeId}`, input)
/** Remove o badge do catálogo e de quem o conquistou (admin). */
export const deleteBadge = (badgeId: string): Promise<void> => api.delete(`/admin/badges/${badgeId}`)

/** Anotações do usuário, mais recentes primeiro. */
export const fetchNotes = (): Promise<Note[]> => api.get<Note[]>("/me/notes")
/** Cria uma anotação (vínculos opcionais com lição e curso). */
export const createNote = (input: NoteInput): Promise<Note> => api.post<Note>("/me/notes", input)
/** Atualiza título e/ou conteúdo da anotação. */
export const updateNote = (noteId: string, input: NoteUpdateInput): Promise<Note> => api.patch<Note>(`/me/notes/${noteId}`, input)
/** Apaga a anotação. */
export const deleteNote = (noteId: string): Promise<void> => api.delete(`/me/notes/${noteId}`)

/** Notificações do usuário, mais recentes primeiro. */
export const fetchNotifications = (limit = NOTIFICATIONS_PAGE_SIZE): Promise<Notification[]> =>
  api.get<Notification[]>("/me/notifications", { query: { limit } })
/** Marca uma notificação como lida. */
export const markNotificationRead = (notificationId: string): Promise<void> => api.post<void>(`/me/notifications/${notificationId}/read`)
/** Marca todas as notificações como lidas. */
export const markAllNotificationsRead = (): Promise<void> => api.post<void>("/me/notifications/read-all")

/** Bibliotecas ativas do catálogo. */
export const fetchLibraryCatalog = (): Promise<LibraryCatalog[]> => api.get<LibraryCatalog[]>("/library")
/** Catálogo completo, incluindo bibliotecas desativadas; só administradores. */
export const fetchAdminLibraryCatalog = (): Promise<LibraryCatalog[]> => api.get<LibraryCatalog[]>("/admin/library")
/** Pede a liberação de uma biblioteca (professor; 409 se já há pedido pendente igual). */
export const createLibraryRequest = (input: LibraryRequestInput): Promise<LibraryRequest> => api.post<LibraryRequest>("/library/requests", input)
/** Pedidos de biblioteca do próprio professor. */
export const fetchMyLibraryRequests = (): Promise<LibraryRequest[]> => api.get<LibraryRequest[]>("/me/library/requests")
/** Todos os pedidos de biblioteca, com o nome de quem pediu (admin). */
export const fetchAdminLibraryRequests = (): Promise<LibraryRequest[]> => api.get<LibraryRequest[]>("/admin/library/requests")
/** Aprova (criando a entrada no catálogo) ou rejeita um pedido (admin). */
export const reviewLibraryRequest = (requestId: string, input: ReviewLibraryRequestInput): Promise<LibraryRequest> =>
  api.post<LibraryRequest>(`/admin/library/requests/${requestId}/review`, input)
/** Ativa ou desativa uma biblioteca do catálogo (admin). */
export const setLibraryCatalogActive = (libraryId: string, active: boolean): Promise<void> =>
  api.patch<void, SchemaInput<typeof libraryCatalogToggleSchema>>(`/admin/library/${libraryId}`, { active })
