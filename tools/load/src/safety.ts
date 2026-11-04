import { isIP } from "node:net"

const LOCAL_HOSTNAMES: ReadonlySet<string> = new Set(["localhost", "ip6-localhost", "::1", "[::1]"])

/** Endereço local (a própria máquina): `localhost`, `*.localhost`, 127.0.0.0/8 e ::1. */
export function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (LOCAL_HOSTNAMES.has(host) || host.endsWith(".localhost")) return true
  return isIP(host) === 4 && host.startsWith("127.")
}

/** Alvo recusado: fora da máquina local e sem `--alvo-autorizado`. */
export class UnauthorizedTargetError extends Error {}

/**
 * Garante que o teste só bate na própria máquina, salvo autorização explícita: um teste de
 * carga contra um servidor de terceiros (ou contra a produção sem aviso) é um ataque de negação
 * de serviço. As URLs de banco (`postgres://`) seguem a mesma regra.
 *
 * @throws UnauthorizedTargetError com a lista de alvos externos quando `authorized` é falso.
 * @throws TypeError se alguma URL for inválida.
 */
export function assertTargetsAllowed(urls: readonly string[], authorized: boolean): void {
  const external = urls.filter((url) => !isLocalHostname(new URL(url).hostname))
  if (external.length === 0 || authorized) return
  const hosts = [...new Set(external.map((url) => new URL(url).host))].join(", ")
  throw new UnauthorizedTargetError(
    `Alvo fora desta máquina (${hosts}). Só rode carga contra um servidor seu, com a equipe avisada, e confirme com --alvo-autorizado.`,
  )
}
