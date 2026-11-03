/**
 * Executado uma vez quando o servidor do Next sobe (não no navegador nem no build).
 * A checagem fica num módulo só de Node: o Edge Runtime não tem `process.exit`.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkServerEnvOrExit } = await import("./lib/config/check-server-env")
    checkServerEnvOrExit(process.env)
  }
}
