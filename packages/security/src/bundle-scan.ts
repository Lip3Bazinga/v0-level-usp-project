/**
 * Varredura do que o Next entrega ao navegador (`.next/static` e as páginas/RSC
 * pré-renderizadas em `.next/server/app`) atrás de segredos e configuração
 * interna: valores-canário injetados no build, chaves privadas, URLs com senha,
 * nomes de variáveis de servidor, hosts internos e source maps.
 */
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

/** Um vazamento encontrado num arquivo entregue ao cliente. */
export interface BundleLeak {
  file: string
  rule: string
  excerpt: string
}

/** Regra de varredura: nome legível e o padrão procurado. */
export interface LeakRule {
  rule: string
  pattern: RegExp
}

/** Padrões que nunca devem aparecer no que vai para o navegador. */
export const LEAK_RULES: readonly LeakRule[] = [
  { rule: "chave privada", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/ },
  { rule: "URL de banco com credencial", pattern: /postgres(?:ql)?:\/\/[^\s"'`:/@]+:[^\s"'`@]+@/ },
  { rule: "URL SMTP com credencial", pattern: /smtps?:\/\/[^\s"'`:/@]+:[^\s"'`@]+@/ },
  { rule: "variável de ambiente do servidor", pattern: /\b(?:DATABASE_URL|RUNNER_TOKEN|SMTP_URL|POSTGRES_PASSWORD|SEED_ADMIN_PASSWORD|SEED_DEMO_PASSWORD|CLOUDFLARE_TUNNEL_TOKEN|API_INTERNAL_URL|SESSION_[A-Z_]+|[A-Z][A-Z0-9_]*_(?:SECRET|API_KEY|PRIVATE_KEY))\b/ },
  { rule: "host interno do compose", pattern: /\b(?:https?:\/\/)?(?:api:4000|postgres:5432|runner:8081|db:5432)\b/ },
  { rule: "token de API comum (AWS/GitHub/Slack/Stripe/Google)", pattern: /\b(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36,}|xox[baprs]-[A-Za-z0-9-]{10,}|sk_live_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35})\b/ },
  { rule: "referência a source map", pattern: /\/\/[#@] sourceMappingURL=(?!data:)/ },
]

const SCANNED_EXTENSIONS = new Set([".js", ".mjs", ".css", ".html", ".rsc", ".body", ".json", ".txt"])
const EXCERPT_RADIUS = 40

/** Valores-canário: segredos falsos que só existem no ambiente do build. */
export function canaryRules(canaries: readonly string[]): LeakRule[] {
  return canaries.filter((canary) => canary.length >= 8).map((canary) => ({ rule: `canário "${canary.slice(0, 6)}…"`, pattern: new RegExp(canary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }))
}

/** Procura as regras num texto; devolve um vazamento por regra encontrada. */
export function scanText(file: string, text: string, rules: readonly LeakRule[]): BundleLeak[] {
  const leaks: BundleLeak[] = []
  for (const { rule, pattern } of rules) {
    const match = pattern.exec(text)
    if (!match) continue
    const start = Math.max(0, match.index - EXCERPT_RADIUS)
    leaks.push({ file, rule, excerpt: text.slice(start, match.index + match[0].length + EXCERPT_RADIUS).replace(/\s+/g, " ") })
  }
  return leaks
}

/** Source map que realmente revela código (o Turbopack às vezes gera mapas vazios, sem `sources`). */
async function exposesSource(file: string): Promise<boolean> {
  try {
    const map: unknown = JSON.parse(await readFile(file, "utf8"))
    if (typeof map !== "object" || map === null) return true
    const sources = "sources" in map && Array.isArray(map.sources) ? map.sources : []
    const sections = "sections" in map && Array.isArray(map.sections) ? map.sections : []
    return sources.length > 0 || sections.length > 0
  } catch {
    return true
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true }).catch(() => [])
  return entries.filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name))
}

/** O que foi varrido e o que foi achado. */
export interface BundleScanResult {
  scannedFiles: number
  sourceMaps: string[]
  leaks: BundleLeak[]
}

/**
 * Varre os arquivos públicos de um build do Next (`<webDir>/.next`).
 *
 * @throws Error quando não há build (`.next/static` vazio).
 */
export async function scanNextBuild(webDir: string, rules: readonly LeakRule[]): Promise<BundleScanResult> {
  const nextDir = path.join(webDir, ".next")
  const clientFiles = await listFiles(path.join(nextDir, "static"))
  if (!clientFiles.length) throw new Error(`nenhum build em ${nextDir} (rode o build da web antes)`)
  // Páginas e payloads RSC pré-renderizados também são enviados ao navegador.
  const prerendered = (await listFiles(path.join(nextDir, "server", "app"))).filter((file) => /\.(html|rsc|body|meta)$/.test(file))
  const publicFiles = (await listFiles(path.join(webDir, "public"))).filter((file) => !file.includes(`${path.sep}pyodide${path.sep}`))
  const files = [...clientFiles, ...prerendered, ...publicFiles]
  const sourceMaps: string[] = []
  for (const file of files.filter((candidate) => candidate.endsWith(".map"))) {
    if (await exposesSource(file)) sourceMaps.push(file)
  }
  const leaks: BundleLeak[] = []
  for (const file of files) {
    if (!SCANNED_EXTENSIONS.has(path.extname(file)) && !file.endsWith(".meta")) continue
    leaks.push(...scanText(path.relative(webDir, file), await readFile(file, "utf8"), rules))
  }
  return { scannedFiles: files.length, sourceMaps: sourceMaps.map((file) => path.relative(webDir, file)), leaks }
}

/** Variáveis `NEXT_PUBLIC_*` (vão para o bundle) cujo nome sugere segredo. */
export function secretLookingPublicVariables(names: readonly string[]): string[] {
  return names.filter((name) => name.startsWith("NEXT_PUBLIC_") && /SECRET|TOKEN|PASSWORD|PRIVATE|DATABASE|_KEY\b|SMTP/.test(name))
}
