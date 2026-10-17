export type LogLevel = "debug" | "info" | "warn" | "error"

export type Logger = (level: LogLevel, message: string, extra?: Record<string, unknown>) => void

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

/** Log JSON de uma linha na saída padrão (coletado pelo Docker). */
export function createLogger(minimumLevel: LogLevel, service = "runner"): Logger {
  return (level, message, extra = {}) => {
    if (LEVEL_RANK[level] < LEVEL_RANK[minimumLevel]) return
    process.stdout.write(JSON.stringify({ time: new Date().toISOString(), level, service, msg: message, ...extra }) + "\n")
  }
}
