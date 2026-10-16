import type {
  Badge, BadgeInput, BadgeUpdateInput, LibraryCatalog, LibraryRequest, LibraryRequestInput, Note, NoteInput, NoteUpdateInput,
  Notification, PublicProfile, ReviewLibraryRequestInput, TeacherApproval, TeacherRequestInput, UserBadge,
} from "@levelusp/contracts"
import { api, getOrNull } from "./client"

// ── Perfis e ranking ─────────────────────────────────────────────────────────
export const fetchLeaderboard = (limit = 50) => api.get<PublicProfile[]>("/leaderboard", { query: { limit } })
export const fetchProfileByUsername = (username: string) => getOrNull<PublicProfile>(`/users/by-username/${encodeURIComponent(username)}`)

// ── Badges ───────────────────────────────────────────────────────────────────
export const fetchAllBadges = () => api.get<Badge[]>("/badges")
export const fetchUserBadges = (userId: string) => api.get<UserBadge[]>(`/users/${userId}/badges`)
export const createBadge = (data: BadgeInput) => api.post<Badge>("/admin/badges", data)
export const updateBadge = (id: string, data: BadgeUpdateInput) => api.patch<Badge>(`/admin/badges/${id}`, data)
export const deleteBadge = (id: string) => api.delete<void>(`/admin/badges/${id}`)

// ── Notas ────────────────────────────────────────────────────────────────────
export const fetchNotes = () => api.get<Note[]>("/me/notes")
export const createNote = (data: NoteInput) => api.post<Note>("/me/notes", data)
export const updateNote = (id: string, data: NoteUpdateInput) => api.patch<Note>(`/me/notes/${id}`, data)
export const deleteNote = (id: string) => api.delete<void>(`/me/notes/${id}`)

// ── Notificações ─────────────────────────────────────────────────────────────
export const fetchNotifications = (limit = 30) => api.get<Notification[]>("/me/notifications", { query: { limit } })
export const markRead = (id: string) => api.post<void>(`/me/notifications/${id}/read`)
export const markAllRead = () => api.post<void>("/me/notifications/read-all")

// ── Bibliotecas Python ───────────────────────────────────────────────────────
export const fetchLibraryCatalog = () => api.get<LibraryCatalog[]>("/library")
export const fetchFullLibraryCatalog = () => api.get<LibraryCatalog[]>("/admin/library")
export const createLibraryRequest = (data: LibraryRequestInput) => api.post<LibraryRequest>("/library/requests", data)
export const fetchMyLibraryRequests = () => api.get<LibraryRequest[]>("/me/library/requests")
export const fetchAllLibraryRequests = () => api.get<LibraryRequest[]>("/admin/library/requests")
export const reviewLibraryRequest = (id: string, data: ReviewLibraryRequestInput) => api.post<LibraryRequest>(`/admin/library/requests/${id}/review`, data)
export const toggleLibraryCatalog = (id: string, active: boolean) => api.patch<void>(`/admin/library/${id}`, { active })

// ── Solicitação para ser professor ───────────────────────────────────────────
export const requestTeacherRole = (data: TeacherRequestInput) => api.post<TeacherApproval>("/me/teacher-request", data)
export const fetchMyTeacherRequest = () => api.get<TeacherApproval | null>("/me/teacher-request")
