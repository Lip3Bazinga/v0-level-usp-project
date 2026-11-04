/**
 * Regras da verificação da cadeia de suprimentos, separadas da linha de comando
 * para serem testadas sem rede: o que conta como dependência suspeita e quais
 * advisories do `pnpm audit` estão aceitos (com justificativa).
 */
import type { RegistryPopularity, RegistryVersion } from "./registry"

/** Pacote real e usado tem bem mais que isso por mês; nome inventado por IA fica perto de zero. */
export const MIN_MONTHLY_DOWNLOADS = 5_000
/** Versão publicada há menos que isso pode ser uma conta sequestrada; vale revisar antes de usar. */
export const FRESH_RELEASE_DAYS = 7
const MS_PER_DAY = 86_400_000

/** Resultado de uma regra: falha bloqueia o CI; aviso só aparece no relatório. */
export interface Finding {
  level: "falha" | "aviso"
  dependency: string
  message: string
}

/** Uma dependência direta já consultada no registry. */
export interface CheckedDependency {
  name: string
  version: string
  lockfileIntegrity: string | null
  registry: RegistryVersion
  popularity: RegistryPopularity
}

/** Aplica as regras de existência, integridade, mantenedores, popularidade e idade. */
export function evaluateDependency(dependency: CheckedDependency, now: Date = new Date()): Finding[] {
  const label = `${dependency.name}@${dependency.version}`
  const findings: Finding[] = []
  const { registry, popularity } = dependency
  if (!registry.exists) return [{ level: "falha", dependency: label, message: "não existe no registry do npm (nome alucinado ou removido)" }]
  if (dependency.lockfileIntegrity && registry.integrity && dependency.lockfileIntegrity !== registry.integrity) {
    findings.push({ level: "falha", dependency: label, message: "hash de integridade do lockfile difere do registry" })
  }
  if (registry.maintainers === 0) findings.push({ level: "falha", dependency: label, message: "sem mantenedores no registry" })
  if (popularity.isRateLimited) {
    findings.push({ level: "aviso", dependency: label, message: "downloads não consultados (limite de taxa da busca do npm); existência, hash e mantenedores conferidos" })
  } else if (popularity.monthlyDownloads === null) {
    findings.push({ level: "falha", dependency: label, message: "a busca do npm não encontra o pacote pelo nome exato" })
  } else if (popularity.monthlyDownloads < MIN_MONTHLY_DOWNLOADS) {
    findings.push({ level: "falha", dependency: label, message: `só ${popularity.monthlyDownloads} downloads/mês (mínimo ${MIN_MONTHLY_DOWNLOADS})` })
  }
  if (registry.deprecated) findings.push({ level: "aviso", dependency: label, message: `versão marcada como obsoleta: ${registry.deprecated}` })
  if (registry.publishedAt && now.getTime() - registry.publishedAt.getTime() < FRESH_RELEASE_DAYS * MS_PER_DAY) {
    findings.push({ level: "aviso", dependency: label, message: `versão publicada há menos de ${FRESH_RELEASE_DAYS} dias (${registry.publishedAt.toISOString()})` })
  }
  return findings
}

/** Advisory do `pnpm audit` aceito conscientemente; vence numa data para ser reavaliado. */
export interface AcceptedAdvisory {
  id: string
  module: string
  reason: string
  /** Data ISO (aaaa-mm-dd) em que a aceitação expira. */
  until: string
}

/**
 * Advisories que não se aplicam ao LevelUSP. Cada um precisa de justificativa;
 * passada a data, o CI volta a falhar e alguém precisa reavaliar.
 */
export const ACCEPTED_ADVISORIES: readonly AcceptedAdvisory[] = [
  {
    id: "GHSA-g3hv-75wg-m249",
    module: "minimatch",
    reason: "só no ESLint (ferramenta de lint, nunca em produção), com padrões de glob escritos por nós",
    until: "2027-03-01",
  },
]

/** Advisory resumido do `pnpm audit --json`. */
export interface AuditAdvisory {
  id: string
  module: string
  severity: string
  title: string
  vulnerableVersions: string
  paths: string[]
}

const BLOCKING_SEVERITIES: ReadonlySet<string> = new Set(["moderate", "high", "critical"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Lê os advisories do JSON do `pnpm audit` (formato compatível com o npm v6). */
export function parseAudit(json: unknown): AuditAdvisory[] {
  if (!isRecord(json) || !isRecord(json.advisories)) return []
  const advisories: AuditAdvisory[] = []
  for (const advisory of Object.values(json.advisories)) {
    if (!isRecord(advisory)) continue
    const findings = Array.isArray(advisory.findings) ? advisory.findings : []
    const paths = findings.flatMap((finding) => (isRecord(finding) && Array.isArray(finding.paths) ? finding.paths.filter((path): path is string => typeof path === "string") : []))
    advisories.push({
      id: typeof advisory.github_advisory_id === "string" ? advisory.github_advisory_id : String(advisory.id),
      module: String(advisory.module_name),
      severity: String(advisory.severity),
      title: String(advisory.title),
      vulnerableVersions: String(advisory.vulnerable_versions),
      paths,
    })
  }
  return advisories
}

/** Advisories moderados ou piores que não estão aceitos (ou cuja aceitação venceu). */
export function blockingAdvisories(advisories: readonly AuditAdvisory[], accepted: readonly AcceptedAdvisory[] = ACCEPTED_ADVISORIES, now: Date = new Date()): AuditAdvisory[] {
  return advisories.filter((advisory) => {
    if (!BLOCKING_SEVERITIES.has(advisory.severity)) return false
    const acceptance = accepted.find((entry) => entry.id === advisory.id && entry.module === advisory.module)
    return !acceptance || new Date(`${acceptance.until}T00:00:00Z`).getTime() < now.getTime()
  })
}
