import { STORAGE_KEYS } from "@/lib/constants/storage"

/** Menor largura (em %) da coluna do editor quando a prévia fica ao lado. */
export const PREVIEW_WIDTH_MIN = 30
/** Maior largura (em %) da coluna do editor quando a prévia fica ao lado. */
export const PREVIEW_WIDTH_MAX = 70
/** Largura (em %) inicial da coluna do editor: metade e metade. */
export const PREVIEW_WIDTH_DEFAULT = 50

/**
 * Limita a largura da coluna do editor a `PREVIEW_WIDTH_MIN`–`PREVIEW_WIDTH_MAX` (%).
 * Valor que não é número finito volta ao padrão.
 */
export function clampPreviewWidth(width: number): number {
  if (!Number.isFinite(width)) return PREVIEW_WIDTH_DEFAULT
  return Math.min(PREVIEW_WIDTH_MAX, Math.max(PREVIEW_WIDTH_MIN, width))
}

/** Preferência "prévia escondida"; `false` quando não há valor ou o `localStorage` está bloqueado. */
export function readPreviewHidden(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.lessonPreviewHidden) === "true"
  } catch {
    return false
  }
}

/** Guarda a preferência "prévia escondida"; falha em silêncio (modo privado, cota cheia). */
export function writePreviewHidden(hidden: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.lessonPreviewHidden, String(hidden))
  } catch {
    // Sem armazenamento, a preferência só vale até recarregar a página.
  }
}

/** Largura (%) guardada da coluna do editor, já limitada; o padrão quando falta, está corrompida ou o `localStorage` está bloqueado. */
export function readPreviewWidth(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.lessonPreviewWidth)
    return raw === null ? PREVIEW_WIDTH_DEFAULT : clampPreviewWidth(Number(raw))
  } catch {
    return PREVIEW_WIDTH_DEFAULT
  }
}

/** Guarda a largura (%) da coluna do editor, limitada; falha em silêncio. */
export function writePreviewWidth(width: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.lessonPreviewWidth, String(clampPreviewWidth(width)))
  } catch {
    // Sem armazenamento, a largura só vale até recarregar a página.
  }
}
