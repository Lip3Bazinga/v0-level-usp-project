/**
 * Leitura mínima do `pnpm-lock.yaml` (formato 9): só o que a verificação da
 * cadeia de suprimentos precisa — dependências diretas de cada importador com
 * a versão resolvida e a resolução (integridade/tarball) de cada pacote.
 * Sem biblioteca de YAML: o formato do lockfile é estável e indentado por 2.
 */

/** Dependência declarada num package.json e a versão que o lockfile fixou. */
export interface DirectDependency {
  importer: string
  name: string
  specifier: string
  /** Versão resolvida sem o sufixo de peers (`16.4.5`), ou `link:...` para pacotes do workspace. */
  version: string
}

/** Como o pacote é baixado: hash de integridade e, se houver, um tarball fora do registry. */
export interface PackageResolution {
  key: string
  integrity: string | null
  tarball: string | null
  /** Dependência git/diretório: não tem integridade verificável pelo registry. */
  isNonRegistry: boolean
}

const IMPORTER_LINE = /^ {2}(\S.*):$/
const DEPENDENCY_GROUP_LINE = /^ {4}(dependencies|devDependencies|optionalDependencies):$/
const DEPENDENCY_NAME_LINE = /^ {6}'?([^':]+)'?:$/
const SPECIFIER_LINE = /^ {8}specifier: (.+)$/
const VERSION_LINE = /^ {8}version: (.+)$/
const PACKAGE_KEY_LINE = /^ {2}'?([^\s'][^']*?)'?:$/
const RESOLUTION_LINE = /^ {4}resolution: \{(.+)\}$/

function stripPeerSuffix(version: string): string {
  const parenthesis = version.indexOf("(")
  return parenthesis === -1 ? version : version.slice(0, parenthesis)
}

/** Linhas de uma seção de topo (`importers:`, `packages:`), sem o cabeçalho. */
function sectionLines(lockfile: string, section: string): string[] {
  const lines = lockfile.split("\n")
  const start = lines.indexOf(`${section}:`)
  if (start === -1) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^\S/.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

/** Dependências diretas de todos os importadores (raiz e pacotes do workspace). */
export function parseDirectDependencies(lockfile: string): DirectDependency[] {
  const dependencies: DirectDependency[] = []
  let importer = ""
  let isInGroup = false
  let current: { name: string; specifier?: string } | null = null
  for (const line of sectionLines(lockfile, "importers")) {
    const importerMatch = IMPORTER_LINE.exec(line)
    if (importerMatch?.[1]) {
      importer = importerMatch[1]
      isInGroup = false
      continue
    }
    if (DEPENDENCY_GROUP_LINE.test(line)) {
      isInGroup = true
      continue
    }
    if (!isInGroup) continue
    const nameMatch = DEPENDENCY_NAME_LINE.exec(line)
    if (nameMatch?.[1]) {
      current = { name: nameMatch[1] }
      continue
    }
    const specifierMatch = SPECIFIER_LINE.exec(line)
    if (specifierMatch?.[1] && current) current.specifier = specifierMatch[1]
    const versionMatch = VERSION_LINE.exec(line)
    if (versionMatch?.[1] && current) {
      dependencies.push({ importer, name: current.name, specifier: current.specifier ?? "", version: stripPeerSuffix(versionMatch[1]) })
      current = null
    }
  }
  return dependencies
}

function resolutionField(body: string, field: string): string | null {
  return new RegExp(`(?:^|,\\s*)${field}: ([^,}]+)`).exec(body)?.[1]?.trim() ?? null
}

/** Resolução de cada pacote da seção `packages:`. */
export function parsePackageResolutions(lockfile: string): PackageResolution[] {
  const resolutions: PackageResolution[] = []
  let key: string | null = null
  for (const line of sectionLines(lockfile, "packages")) {
    const keyMatch = PACKAGE_KEY_LINE.exec(line)
    if (keyMatch?.[1]) {
      key = keyMatch[1]
      continue
    }
    const resolutionMatch = RESOLUTION_LINE.exec(line)
    if (resolutionMatch?.[1] && key) {
      const body = resolutionMatch[1]
      const type = resolutionField(body, "type")
      resolutions.push({
        key,
        integrity: resolutionField(body, "integrity"),
        tarball: resolutionField(body, "tarball"),
        isNonRegistry: type === "git" || type === "directory" || body.includes("repo:") || body.includes("commit:"),
      })
      key = null
    }
  }
  return resolutions
}

/** Problemas de integridade do lockfile: sem hash sha512, tarball fora do registry, git/diretório. */
export function findLockfileIntegrityProblems(resolutions: readonly PackageResolution[], registryHost = "registry.npmjs.org"): string[] {
  const problems: string[] = []
  for (const resolution of resolutions) {
    if (resolution.isNonRegistry) problems.push(`${resolution.key}: dependência git/diretório (sem integridade do registry)`)
    else if (!resolution.integrity?.startsWith("sha512-")) problems.push(`${resolution.key}: sem hash sha512 de integridade (${resolution.integrity ?? "ausente"})`)
    if (resolution.tarball && new URL(resolution.tarball).host !== registryHost) problems.push(`${resolution.key}: tarball fora do registry (${resolution.tarball})`)
  }
  return problems
}

/** Chave `nome@versão` usada na seção `packages:` (o nome com escopo mantém o `@` inicial). */
export function packageKey(name: string, version: string): string {
  return `${name}@${version}`
}
