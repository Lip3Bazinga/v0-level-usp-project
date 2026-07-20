/**
 * Tempo relativo em pt-BR ("agora", "há 5min", "há 3h", "há 2d").
 * Fonte única — antes duplicado em notification-bell, admin/audit-page e
 * admin/approvals-page.
 *
 * `withNow`: quando true (padrão do sino de notificações) devolve "agora" para
 * menos de 1 minuto; as telas de admin sempre mostraram "há 0min", então
 * passam `false` para preservar o comportamento atual.
 */
export function timeAgo(iso: string, { withNow = false }: { withNow?: boolean } = {}): string {
  const elapsedMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(elapsedMs / 60000)
  if (withNow && minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
}

/**
 * Data amigável em pt-BR: "Hoje, 14:32" · "Ontem" · "3 dias atrás" · "05 mar".
 * Fonte única — antes duplicado em notas/page e notes-floating-widget.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  const elapsedDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (elapsedDays === 0) {
    return `Hoje, ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  }
  if (elapsedDays === 1) return "Ontem"
  if (elapsedDays < 7) return `${elapsedDays} dias atrás`
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

/**
 * Remove HTML e trunca o texto com reticências.
 * Fonte única — antes duplicado em notas/page (max 80) e no widget (max 72).
 */
export function snippet(text: string, max = 80): string {
  const plainText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  return plainText.length > max ? plainText.slice(0, max) + "…" : plainText
}
