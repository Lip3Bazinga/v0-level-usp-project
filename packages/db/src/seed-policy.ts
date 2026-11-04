/**
 * Regras de segurança do seed, puras (testáveis sem banco).
 *
 * As contas de demonstração usam uma senha publicada no README. Ela só é
 * aceita quando o banco é local (dev/CI); num banco de servidor (homologação
 * exposta pelo túnel, produção) o seed exige `SEED_DEMO_PASSWORD` própria —
 * senão qualquer pessoa entraria como professora pela internet.
 */

/** Senha pública das contas de demonstração (README); só vale em banco local. */
export const PUBLIC_DEMO_PASSWORD = "demonstracao123"
/** Tamanho mínimo da senha de demonstração escolhida para servidores. */
export const MIN_DEMO_PASSWORD_LENGTH = 12

const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]", "::1"])

/** Se a URL do banco aponta para a própria máquina (dev, CI). URL inválida conta como remota. */
export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(databaseUrl).hostname)
  } catch {
    return false
  }
}

/**
 * Senha das contas de demonstração para este seed.
 *
 * @throws Error quando o banco não é local e `SEED_DEMO_PASSWORD` falta ou tem menos de {@link MIN_DEMO_PASSWORD_LENGTH} caracteres.
 */
export function resolveDemoPassword(databaseUrl: string, configured: string | undefined): string {
  const password = configured?.trim() ? configured : undefined
  if (password === undefined) {
    if (isLocalDatabaseUrl(databaseUrl)) return PUBLIC_DEMO_PASSWORD
    throw new Error("SEED_DEMO_USERS=true num banco de servidor exige SEED_DEMO_PASSWORD (a senha padrão é pública no README)")
  }
  if (!isLocalDatabaseUrl(databaseUrl) && password.length < MIN_DEMO_PASSWORD_LENGTH) throw new Error(`SEED_DEMO_PASSWORD precisa de ${MIN_DEMO_PASSWORD_LENGTH}+ caracteres`)
  return password
}
