import type { Track, TrackCertificate, TrackCertificateIssue, TrackWithCourses } from "@levelusp/contracts"
import { api, HTTP_STATUS, nullOnStatus } from "./client"

/** Trilhas publicadas, na ordem de exibição, com a contagem de cursos. */
export const fetchTracks = (): Promise<Track[]> => api.get<Track[]>("/tracks")

/** Trilha com os cursos na ordem e a situação do usuário em cada um; null quando não existe ou não está publicada. */
export const fetchTrack = (slug: string): Promise<TrackWithCourses | null> =>
  nullOnStatus(api.get<TrackWithCourses>(`/tracks/${encodeURIComponent(slug)}`), HTTP_STATUS.NOT_FOUND)

/** Certificados de trilha do usuário. */
export const fetchMyTrackCertificates = (): Promise<TrackCertificate[]> => api.get<TrackCertificate[]>("/me/track-certificates")

/** Emite o certificado da trilha (403 enquanto faltar certificado de algum curso); idempotente. */
export const issueTrackCertificate = (trackId: string): Promise<TrackCertificateIssue> =>
  api.post<TrackCertificateIssue>(`/me/tracks/${trackId}/certificate`)
