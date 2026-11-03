import { describe, expect, it } from "vitest"
import { findLockfileIntegrityProblems, parseDirectDependencies, parsePackageResolutions } from "./lockfile"
import { blockingAdvisories, evaluateDependency, parseAudit, type CheckedDependency } from "./supply-chain"
import { editDistance, findTyposquats } from "./typosquat"

const LOCKFILE = `lockfileVersion: '9.0'

importers:

  .:
    devDependencies:
      turbo:
        specifier: ^2.11.8
        version: 2.11.8

  apps/web:
    dependencies:
      '@levelusp/contracts':
        specifier: workspace:*
        version: link:../../packages/contracts
      next:
        specifier: 16.4.5
        version: 16.4.5(react@19.3.1)

packages:

  '@babel/core@7.29.7':
    resolution: {integrity: sha512-aaa}

  next@16.4.5:
    resolution: {integrity: sha512-bbb}
    engines: {node: '>=20.9.0'}

  evil@1.0.0:
    resolution: {tarball: https://evil.example/evil-1.0.0.tgz}

  gitdep@1.0.0:
    resolution: {commit: abc123, repo: https://github.com/x/y, type: git}

snapshots:

  next@16.4.5: {}
`

const NOW = new Date("2026-11-03T12:00:00Z")

function dependency(overrides: Partial<CheckedDependency> = {}): CheckedDependency {
  return {
    name: "next",
    version: "16.4.5",
    lockfileIntegrity: "sha512-bbb",
    registry: { exists: true, integrity: "sha512-bbb", maintainers: 3, deprecated: null, publishedAt: new Date("2026-01-01T00:00:00Z") },
    popularity: { monthlyDownloads: 30_000_000, dependents: 9000 },
    ...overrides,
  }
}

describe("lockfile", () => {
  it("lê as dependências diretas de cada importador, sem o sufixo de peers", () => {
    expect(parseDirectDependencies(LOCKFILE)).toEqual([
      { importer: ".", name: "turbo", specifier: "^2.11.8", version: "2.11.8" },
      { importer: "apps/web", name: "@levelusp/contracts", specifier: "workspace:*", version: "link:../../packages/contracts" },
      { importer: "apps/web", name: "next", specifier: "16.4.5", version: "16.4.5" },
    ])
  })

  it("aponta pacote sem sha512, tarball fora do registry e dependência git", () => {
    const problems = findLockfileIntegrityProblems(parsePackageResolutions(LOCKFILE))
    expect(problems).toHaveLength(3)
    expect(problems.join("\n")).toMatch(/evil@1\.0\.0: sem hash sha512/)
    expect(problems.join("\n")).toMatch(/evil@1\.0\.0: tarball fora do registry/)
    expect(problems.join("\n")).toMatch(/gitdep@1\.0\.0: dependência git/)
  })
})

describe("regras do registry", () => {
  it("pacote real e popular passa", () => {
    expect(evaluateDependency(dependency(), NOW)).toEqual([])
  })

  it("pacote inexistente (alucinado) falha", () => {
    const findings = evaluateDependency(dependency({ name: "react-secure-auth-helper", registry: { exists: false, integrity: null, maintainers: 0, deprecated: null, publishedAt: null } }), NOW)
    expect(findings).toHaveLength(1)
    expect(findings[0]?.level).toBe("falha")
    expect(findings[0]?.message).toMatch(/não existe/)
  })

  it("hash diferente do registry, sem mantenedor e quase sem downloads falham", () => {
    const findings = evaluateDependency(
      dependency({
        registry: { exists: true, integrity: "sha512-outro", maintainers: 0, deprecated: null, publishedAt: new Date("2026-01-01T00:00:00Z") },
        popularity: { monthlyDownloads: 12, dependents: 0 },
      }),
      NOW,
    )
    expect(findings.map((finding) => finding.level)).toEqual(["falha", "falha", "falha"])
  })

  it("busca do npm com limite de taxa vira aviso (existência e hash continuam conferidos)", () => {
    const findings = evaluateDependency(dependency({ popularity: { monthlyDownloads: null, dependents: null, isRateLimited: true } }), NOW)
    expect(findings.map((finding) => finding.level)).toEqual(["aviso"])
  })

  it("versão recém-publicada e obsoleta geram aviso, não falha", () => {
    const findings = evaluateDependency(dependency({ registry: { exists: true, integrity: "sha512-bbb", maintainers: 1, deprecated: "use a 3.x", publishedAt: new Date("2026-11-01T00:00:00Z") } }), NOW)
    expect(findings.map((finding) => finding.level)).toEqual(["aviso", "aviso"])
  })
})

describe("typosquatting", () => {
  it("distância de Damerau-Levenshtein conta transposição como 1", () => {
    expect(editDistance("raect", "react")).toBe(1)
    expect(editDistance("expres", "express")).toBe(1)
    expect(editDistance("lodash", "lodash")).toBe(0)
  })

  it("acusa imitações clássicas e escopo trocado; aceita os pacotes legítimos", () => {
    const suspects = findTyposquats(["raect", "expresss", "lodash-js", "cross-env.js", "@nestj/core", "@type/node", "next", "@tiptap/react", "@types/react", "bcryptjs", "zod"])
    expect(suspects.map((suspect) => suspect.name).sort()).toEqual(["@nestj/core", "@type/node", "cross-env.js", "expresss", "lodash-js", "raect"])
  })

  it("lista de pares liberados silencia uma semelhança conferida à mão", () => {
    expect(findTyposquats(["expresss"], new Set(["expresss→express"]))).toEqual([])
  })
})

describe("pnpm audit", () => {
  const audit = {
    advisories: {
      "1": { github_advisory_id: "GHSA-aaaa", module_name: "minimatch", severity: "moderate", title: "DoS", vulnerable_versions: "<11", findings: [{ paths: ["a>b"] }] },
      "2": { github_advisory_id: "GHSA-bbbb", module_name: "next", severity: "critical", title: "RCE", vulnerable_versions: "<16.4.1", findings: [{ paths: ["web>next"] }] },
      "3": { github_advisory_id: "GHSA-cccc", module_name: "x", severity: "low", title: "baixo", vulnerable_versions: "*", findings: [] },
    },
  }

  it("bloqueia moderado+ não aceito e respeita a validade da aceitação", () => {
    const advisories = parseAudit(audit)
    const accepted = [{ id: "GHSA-aaaa", module: "minimatch", reason: "lint", until: "2027-01-01" }]
    expect(blockingAdvisories(advisories, accepted, NOW).map((advisory) => advisory.id)).toEqual(["GHSA-bbbb"])
    expect(blockingAdvisories(advisories, accepted, new Date("2027-02-01T00:00:00Z")).map((advisory) => advisory.id)).toEqual(["GHSA-aaaa", "GHSA-bbbb"])
  })
})
