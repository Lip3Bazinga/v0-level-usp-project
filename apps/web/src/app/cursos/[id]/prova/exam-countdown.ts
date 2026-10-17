import { MS_PER_MINUTE, MS_PER_SECOND } from "@/lib/constants"

/** Abaixo disso o cronômetro fica vermelho. */
export const LOW_TIME_WARNING_MS = 5 * MS_PER_MINUTE

const SECONDS_PER_MINUTE = MS_PER_MINUTE / MS_PER_SECOND

/** "m:ss" do tempo restante; prazo vencido aparece como "0:00". */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / MS_PER_SECOND))
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
