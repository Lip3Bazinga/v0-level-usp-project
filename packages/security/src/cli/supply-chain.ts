/**
 * `pnpm security:deps` — cadeia de suprimentos:
 *   1. toda dependência direta (todos os package.json) existe no npm, na versão do
 *      lockfile, com o mesmo hash, mantenedores e downloads (pega pacote "alucinado");
 *   2. nenhum nome imita um pacote popular (typosquatting/slopsquatting);
 *   3. todo pacote do lockfile tem integridade sha512 e vem do registry;
 *   4. `pnpm audit --prod` sem advisory moderado+ fora da lista aceita.
 * Sai com código 1 se houver falha. Precisa de rede (registry.npmjs.org).
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { findLockfileIntegrityProblems, packageKey, parseDirectDependencies, parsePackageResolutions } from "../lockfile"
import { fetchPopularity, fetchRegistryVersion, mapWithConcurrency } from "../registry"
import { blockingAdvisories, evaluateDependency, parseAudit, type Finding } from "../supply-chain"
import { findTyposquats } from "../typosquat"

const ROOT = path.resolve(import.meta.dirname, "../../../..")
const CONCURRENCY = 6
const SEARCH_CONCURRENCY = 1
const AUDIT_BUFFER_BYTES = 64 * 1024 * 1024

/**
 * Pares "nome→popular" parecidos de propósito e verificados à mão (pacotes oficiais
 * do mesmo ecossistema). Acrescente só depois de conferir o dono no npm.
 */
const ALLOWED_LOOKALIKES: ReadonlySet<string> = new Set<string>([])

function readLockfile(): string {
  return readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8")
}

function runAudit(): unknown {
  try {
    const output = execFileSync("pnpm", ["audit", "--prod", "--json"], { cwd: ROOT, encoding: "utf8", maxBuffer: AUDIT_BUFFER_BYTES, stdio: ["ignore", "pipe", "pipe"] })
    return JSON.parse(output)
  } catch (error) {
    // `pnpm audit` sai com código 1 quando encontra algo; o JSON vem no stdout mesmo assim.
    const stdout = typeof error === "object" && error !== null && "stdout" in error ? error.stdout : null
    if (typeof stdout === "string" && stdout.trim().startsWith("{")) return JSON.parse(stdout)
    throw error
  }
}

function printFindings(title: string, findings: readonly Finding[]): void {
  console.log(`\n## ${title}\n`)
  if (!findings.length) {
    console.log("Nenhum problema.")
    return
  }
  for (const finding of findings) console.log(`- [${finding.level}] ${finding.dependency}: ${finding.message}`)
}

async function main(): Promise<void> {
  const lockfile = readLockfile()
  const resolutions = parsePackageResolutions(lockfile)
  const integrityByKey = new Map(resolutions.map((resolution) => [resolution.key, resolution.integrity]))
  const direct = parseDirectDependencies(lockfile).filter((dependency) => !dependency.version.startsWith("link:"))
  const unique = [...new Map(direct.map((dependency) => [packageKey(dependency.name, dependency.version), dependency])).values()]
  console.log(`# Cadeia de suprimentos\n\n${unique.length} dependências diretas (nome@versão) em ${new Set(direct.map((dependency) => dependency.importer)).size} package.json; ${resolutions.length} pacotes no lockfile.`)

  const names = [...new Set(unique.map((dependency) => dependency.name))]
  // A busca do npm tem limite de taxa mais baixo que o registry: uma consulta por nome, poucas por vez.
  const popularityByName = new Map(await mapWithConcurrency(names, SEARCH_CONCURRENCY, async (name) => [name, await fetchPopularity(name)] as const))
  const registryFindings = (
    await mapWithConcurrency(unique, CONCURRENCY, async (dependency) =>
      evaluateDependency({
        name: dependency.name,
        version: dependency.version,
        lockfileIntegrity: integrityByKey.get(packageKey(dependency.name, dependency.version)) ?? null,
        registry: await fetchRegistryVersion(dependency.name, dependency.version),
        popularity: popularityByName.get(dependency.name) ?? { monthlyDownloads: null, dependents: null },
      }),
    )
  ).flat()
  printFindings("Registry (existência, hash, mantenedores, downloads, idade)", registryFindings)

  const typosquatFindings: Finding[] = findTyposquats(names, ALLOWED_LOOKALIKES).map((suspect) => ({
    level: "falha",
    dependency: suspect.name,
    message: `parecido com "${suspect.resembles}" (${suspect.reason})`,
  }))
  printFindings("Nomes parecidos com pacotes populares", typosquatFindings)

  const lockfileFindings: Finding[] = findLockfileIntegrityProblems(resolutions).map((problem) => ({ level: "falha", dependency: "pnpm-lock.yaml", message: problem }))
  printFindings("Integridade do lockfile", lockfileFindings)

  const advisories = parseAudit(runAudit())
  const blocking = blockingAdvisories(advisories)
  const auditFindings: Finding[] = blocking.map((advisory) => ({
    level: "falha",
    dependency: `${advisory.module} ${advisory.vulnerableVersions}`,
    message: `${advisory.severity} ${advisory.id}: ${advisory.title} (${advisory.paths.slice(0, 2).join("; ")})`,
  }))
  console.log(`\n${advisories.length} advisories no pnpm audit --prod; ${advisories.length - blocking.length} aceitos ou de baixa severidade.`)
  printFindings("pnpm audit --prod", auditFindings)

  const failures = [...registryFindings, ...typosquatFindings, ...lockfileFindings, ...auditFindings].filter((finding) => finding.level === "falha")
  console.log(`\n${failures.length ? `FALHOU: ${failures.length} problema(s).` : "OK: nenhuma falha."}`)
  process.exitCode = failures.length ? 1 : 0
}

await main()
