/**
 * `pnpm security:web-bundle` — procura segredos e configuração interna no que o
 * Next entrega ao navegador.
 *
 *   --build   faz o build da web com segredos-canário aleatórios no ambiente
 *             (DATABASE_URL, RUNNER_TOKEN, SMTP_URL, SESSION_SECRET…) e prova que
 *             nenhum deles chegou ao bundle, às páginas pré-renderizadas ou ao RSC.
 *   sem flag  varre o build existente; canários extras em SECURITY_CANARIES (vírgulas).
 */
import { execFileSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { canaryRules, LEAK_RULES, scanNextBuild, secretLookingPublicVariables } from "../bundle-scan"

const ROOT = path.resolve(import.meta.dirname, "../../../..")
const WEB_DIR = path.join(ROOT, "apps", "web")

function canary(prefix: string): string {
  return `${prefix}${randomBytes(12).toString("hex")}`
}

function buildWithCanaries(): string[] {
  const secrets = { password: canary("CanaryDbPass"), runner: canary("CanaryRunner"), smtp: canary("CanarySmtp"), session: canary("CanarySession"), admin: canary("CanaryAdmin") }
  const env = {
    ...process.env,
    DATABASE_URL: `postgres://canary_user:${secrets.password}@db-canary.internal:5432/levelusp`,
    RUNNER_TOKEN: secrets.runner,
    SMTP_URL: `smtp://canary:${secrets.smtp}@smtp-canary.internal:587`,
    SESSION_SECRET: secrets.session,
    SEED_ADMIN_PASSWORD: secrets.admin,
    API_INTERNAL_URL: process.env.API_INTERNAL_URL ?? "http://api:4000",
    NEXT_TELEMETRY_DISABLED: "1",
  }
  console.log("build da web com segredos-canário no ambiente…")
  execFileSync("pnpm", ["--filter", "@levelusp/web", "build"], { cwd: ROOT, env, stdio: "inherit" })
  return [...Object.values(secrets), "db-canary.internal", "smtp-canary.internal"]
}

async function publicVariableNames(): Promise<string[]> {
  const names = new Set<string>()
  const entries = await readdir(path.join(WEB_DIR, "src"), { withFileTypes: true, recursive: true })
  const files = [...entries.filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name)).map((entry) => path.join(entry.parentPath, entry.name)), path.join(WEB_DIR, "next.config.mjs")]
  for (const file of files) {
    for (const match of (await readFile(file, "utf8")).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) names.add(match[0])
  }
  return [...names].sort()
}

async function main(): Promise<void> {
  const shouldBuild = process.argv.includes("--build")
  const extraCanaries = (process.env.SECURITY_CANARIES ?? "").split(",").map((value) => value.trim()).filter(Boolean)
  const canaries = [...(shouldBuild ? buildWithCanaries() : []), ...extraCanaries]
  const result = await scanNextBuild(WEB_DIR, [...LEAK_RULES, ...canaryRules(canaries)])
  const publicNames = await publicVariableNames()
  const suspiciousPublic = secretLookingPublicVariables(publicNames)

  console.log(`\n# Bundle da web\n\n${result.scannedFiles} arquivos públicos varridos; ${canaries.length} canários.`)
  console.log(`Variáveis NEXT_PUBLIC_* usadas: ${publicNames.join(", ") || "nenhuma"}`)
  for (const name of suspiciousPublic) console.log(`- [falha] ${name}: NEXT_PUBLIC_ com nome de segredo (vai para o navegador)`)
  for (const map of result.sourceMaps) console.log(`- [falha] source map publicado: ${map}`)
  for (const leak of result.leaks) console.log(`- [falha] ${leak.rule} em ${leak.file}: …${leak.excerpt}…`)
  const failures = suspiciousPublic.length + result.sourceMaps.length + result.leaks.length
  console.log(`\n${failures ? `FALHOU: ${failures} problema(s).` : "OK: nenhum segredo, host interno ou source map no que vai para o navegador."}`)
  process.exitCode = failures ? 1 : 0
}

await main()
