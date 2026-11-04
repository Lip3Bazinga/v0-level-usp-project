import type {
  Badge, BadgeInput, BadgeUpdateInput, LibraryCatalog, LibraryRequest, LibraryRequestInput, Note, NoteInput,
  NoteUpdateInput, Notification, PublicProfile, ReviewLibraryRequestInput, UserBadge,
} from "@levelusp/contracts"
import type { libraryCatalogToggleSchema } from "@levelusp/contracts"
import type { SchemaInput } from "@/lib/types/schema"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

const LEADERBOARD_SIZE = 50
const NOTIFICATIONS_PAGE_SIZE = 30

export const fetchLeaderboard = (limit = LEADERBOARD_SIZE) =>
  api.get<PublicProfile[]>("/leaderboard", { query: { limit } })
export const fetchProfileByUsername = (username: string) =>
  nullOnStatus(api.get<PublicProfile>(`/users/by-username/${encodeURIComponent(username)}`), HTTP_STATUS.NOT_FOUND)

export const fetchBadges = () => api.get<Badge[]>("/badges")
/** Inclui badges inativas; só administradores. */
export const fetchAdminBadges = () => api.get<Badge[]>("/admin/badges")
export const fetchUserBadges = (userId: string) => api.get<UserBadge[]>(`/users/${userId}/badges`)
export const createBadge = (input: BadgeInput) => api.post<Badge>("/admin/badges", input)
export const updateBadge = (badgeId: string, input: BadgeUpdateInput) => api.patch<Badge>(`/admin/badges/${badgeId}`, input)
export const deleteBadge = (badgeId: string) => api.delete(`/admin/badges/${badgeId}`)

export const fetchNotes = () => api.get<Note[]>("/me/notes")
export const createNote = (input: NoteInput) => api.post<Note>("/me/notes", input)
export const updateNote = (noteId: string, input: NoteUpdateInput) => api.patch<Note>(`/me/notes/${noteId}`, input)
export const deleteNote = (noteId: string) => api.delete(`/me/notes/${noteId}`)

export const fetchNotifications = (limit = NOTIFICATIONS_PAGE_SIZE) =>
  api.get<Notification[]>("/me/notifications", { query: { limit } })
export const markNotificationRead = (notificationId: string) => api.post<void>(`/me/notifications/${notificationId}/read`)
export const markAllNotificationsRead = () => api.post<void>("/me/notifications/read-all")

export const fetchLibraryCatalog = () => api.get<LibraryCatalog[]>("/library")
/** Catálogo completo, incluindo bibliotecas desativadas; só administradores. */
export const fetchAdminLibraryCatalog = () => api.get<LibraryCatalog[]>("/admin/library")
export const createLibraryRequest = (input: LibraryRequestInput) => api.post<LibraryRequest>("/library/requests", input)
export const fetchMyLibraryRequests = () => api.get<LibraryRequest[]>("/me/library/requests")
export const fetchAdminLibraryRequests = () => api.get<LibraryRequest[]>("/admin/library/requests")
export const reviewLibraryRequest = (requestId: string, input: ReviewLibraryRequestInput) =>
  api.post<LibraryRequest>(`/admin/library/requests/${requestId}/review`, input)
export const setLibraryCatalogActive = (libraryId: string, active: boolean) =>
  api.patch<void, SchemaInput<typeof libraryCatalogToggleSchema>>(`/admin/library/${libraryId}`, { active })
