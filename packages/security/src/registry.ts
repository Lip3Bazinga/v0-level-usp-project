/**
 * Consultas ao registry público do npm para provar que cada dependência é um
 * pacote real, com histórico: a versão existe, o hash bate com o lockfile, há
 * mantenedores e downloads. Só usa endpoints leves (documento da versão e busca),
 * nunca o "packument" completo (dezenas de MB para pacotes como `next`).
 */

const REGISTRY = "https://registry.npmjs.org"
const REQUEST_TIMEOUT_MS = 20_000

/** O que o registry diz sobre uma versão específica. */
export interface RegistryVersion {
  exists: boolean
  integrity: string | null
  maintainers: number
  deprecated: string | null
  /** Data de publicação da versão (cabeçalho Last-Modified do tarball). */
  publishedAt: Date | null
}

/** Popularidade do pacote pela busca do npm (null quando a busca não o encontra pelo nome exato). */
export interface RegistryPopularity {
  monthlyDownloads: number | null
  dependents: number | null
  /** A busca recusou por limite de taxa mesmo após as novas tentativas: popularidade desconhecida. */
  isRateLimited?: boolean
}

/** Limite de taxa que persistiu depois de todas as tentativas. */
export class RateLimitedError extends Error {
  constructor(url: string) {
    super(`${url}: limite de taxa (HTTP 429)`)
    this.name = "RateLimitedError"
  }
}

function encodeName(name: string): string {
  return name.startsWith("@") ? `@${encodeURIComponent(name.slice(1))}` : encodeURIComponent(name)
}

const MAX_RETRIES = 8
const MAX_RETRY_DELAY_MS = 30_000
const BASE_RETRY_DELAY_MS = 1_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Espera pedida pelo servidor (`Retry-After` em segundos) ou recuo exponencial. */
function retryDelayMs(response: Response, attempt: number): number {
  const retryAfterSeconds = Number(response.headers.get("retry-after"))
  const delay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1_000 : BASE_RETRY_DELAY_MS * 2 ** attempt
  return Math.min(delay, MAX_RETRY_DELAY_MS)
}

async function getJson(url: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { accept: "application/json" } })
    if (response.status === 404) return null
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      await sleep(retryDelayMs(response, attempt))
      continue
    }
    if (response.status === 429) throw new RateLimitedError(url)
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
    const body: unknown = await response.json()
    return body
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringField(record: Record<string, unknown>, field: string): string | null {
  const value = record[field]
  return typeof value === "string" ? value : null
}

/**
 * Documento de `nome@versão` no registry e a data de publicação do tarball.
 *
 * @throws Error em falha de rede ou resposta inesperada (404 vira `exists: false`).
 */
export async function fetchRegistryVersion(name: string, version: string): Promise<RegistryVersion> {
  const document = await getJson(`${REGISTRY}/${encodeName(name)}/${encodeURIComponent(version)}`)
  if (!isRecord(document)) return { exists: false, integrity: null, maintainers: 0, deprecated: null, publishedAt: null }
  const dist = isRecord(document.dist) ? document.dist : {}
  const maintainers = Array.isArray(document.maintainers) ? document.maintainers.length : 0
  const tarball = stringField(dist, "tarball")
  let publishedAt: Date | null = null
  if (tarball) {
    const head = await fetch(tarball, { method: "HEAD", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    const lastModified = head.headers.get("last-modified")
    publishedAt = lastModified ? new Date(lastModified) : null
  }
  return { exists: true, integrity: stringField(dist, "integrity"), maintainers, deprecated: stringField(document, "deprecated"), publishedAt }
}

/** Downloads mensais e dependentes pela busca do npm (resultado com o nome exato). */
export async function fetchPopularity(name: string): Promise<RegistryPopularity> {
  let result: unknown
  try {
    result = await getJson(`${REGISTRY}/-/v1/search?text=${encodeURIComponent(name)}&size=5`)
  } catch (error) {
    if (error instanceof RateLimitedError) return { monthlyDownloads: null, dependents: null, isRateLimited: true }
    throw error
  }
  const objects = isRecord(result) && Array.isArray(result.objects) ? result.objects : []
  for (const entry of objects) {
    if (!isRecord(entry) || !isRecord(entry.package) || entry.package.name !== name) continue
    const downloads = isRecord(entry.downloads) && typeof entry.downloads.monthly === "number" ? entry.downloads.monthly : null
    const dependents = typeof entry.dependents === "string" ? Number(entry.dependents) : typeof entry.dependents === "number" ? entry.dependents : null
    return { monthlyDownloads: downloads, dependents }
  }
  return { monthlyDownloads: null, dependents: null }
}

/** Executa `task` sobre os itens com no máximo `concurrency` em paralelo, preservando a ordem. */
export async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array<R>(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++
      const item = items[index]
      if (item !== undefined) results[index] = await task(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}
